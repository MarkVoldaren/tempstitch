"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { getActiveProjects, getArchivedProjects, getProjectCompletion, getProjectLocations } from "@temperature-blanket/core";
import { Banner, ProgressHeader } from "./WebUi";
import { useAppData } from "@/providers/AppDataProvider";

export function ProjectsView() {
  const { data, error, importProjectsFromJson, initializing } = useAppData();
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const activeProjects = getActiveProjects(data.projects);
  const archivedProjects = getArchivedProjects(data.projects);

  async function runImport(payload: string) {
    try {
      const count = await importProjectsFromJson(payload);
      setMessage(`Imported ${count} project${count === 1 ? "" : "s"}.`);
      setImportJson("");
      setShowImport(false);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Unable to import that file.");
    }
  }

  return <div className="stackLg">
    <section className="heroCard heroSplit"><div><p className="eyebrow">Your yarn forecast</p><h2 className="pageTitle">Blankets in progress</h2><p className="pageCopy">Turn a year of weather into one thoughtful row at a time.</p><div className="heroStats"><span><strong>{activeProjects.length}</strong> active</span><span><strong>{archivedProjects.length}</strong> archived</span></div></div><div className="heroKnot" aria-hidden="true"><span>365</span><small>rows</small></div></section>
    {error ? <Banner tone="danger">{error}</Banner> : null}
    {message ? <Banner tone={message.startsWith("Imported") ? "success" : "warning"}>{message}</Banner> : null}
    <div className="toolbar"><Link className="primaryButton" href="/app/projects/new">Create a blanket</Link><button className="secondaryButton" onClick={() => setShowImport((value) => !value)} type="button">Import project</button></div>
    {showImport ? <section className="card stackMd"><h3 className="sectionTitle">Import a project</h3><p className="mutedText">Paste a mobile or web export, or choose a JSON file. Imported IDs are regenerated safely.</p><textarea className="input textarea" onChange={(event) => setImportJson(event.target.value)} placeholder="Paste project JSON" value={importJson} /><input accept="application/json,.json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void file.text().then(runImport); }} ref={fileInput} type="file"/><div className="inlineActions"><button className="primaryButton" disabled={!importJson.trim()} onClick={() => void runImport(importJson)} type="button">Import pasted JSON</button><button className="secondaryButton" onClick={() => fileInput.current?.click()} type="button">Choose file</button></div></section> : null}
    {initializing ? <div className="card">Loading your projects...</div> : null}
    <div className="projectGrid">{activeProjects.map((project) => { const completion = getProjectCompletion(project.id, data.progressRows); const locations = getProjectLocations(project.id, data.projectLocations); return <article className="projectCard" key={project.id}><div className="projectCardTop"><div><p className="eyebrow">{locations.length > 1 ? `${locations.length} locations` : project.locationName}</p><h3 className="projectTitle">{project.name}</h3></div><span className={`sourceBadge ${project.weatherSource}`}>{project.weatherSourceLabel}</span></div><p className="mutedText">{project.startDate} to {project.endDate} · {project.craftType} · {project.stitchName}</p>{locations.length > 1 ? <p className="projectLocationSummary">{locations.map((location) => location.locationName).join(" → ")}</p> : null}<ProgressHeader {...completion}/><div className="projectActions"><Link className="primaryButton" href={`/app/projects/${project.id}/build`}>Build</Link><Link className="secondaryButton" href={`/app/projects/${project.id}/preview`}>Preview</Link><Link className="ghostButton" href={`/app/projects/${project.id}/settings`}>Settings</Link></div></article>; })}</div>
    {!initializing && activeProjects.length === 0 ? <div className="card emptyState"><h3 className="sectionTitle">No active blankets</h3><p className="mutedText">Start a new project or restore one from the archive.</p></div> : null}
    {archivedProjects.length ? <section className="card stackMd"><h3 className="sectionTitle">Archived projects</h3>{archivedProjects.map((project) => <div className="archivedRow" key={project.id}><div><strong>{project.name}</strong><p className="mutedText">{project.locationName}</p></div><Link className="secondaryButton" href={`/app/projects/${project.id}/settings`}>Manage</Link></div>)}</section> : null}
  </div>;
}
