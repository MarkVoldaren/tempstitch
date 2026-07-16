"use client";

import Link from "next/link";

import { getActiveProjects, getArchivedProjects, getProjectCompletion } from "@temperature-blanket/core";

import { useAppData } from "@/providers/AppDataProvider";
import { useAuth } from "@/providers/AuthProvider";

export function ProjectsView() {
  const { configured } = useAuth();
  const { data, error, initializing } = useAppData();
  const activeProjects = getActiveProjects(data.projects);
  const archivedProjects = getArchivedProjects(data.projects);

  return (
    <div className="stackLg">
      <section className="heroCard">
        <p className="eyebrow">Responsive web workspace</p>
        <h2 className="pageTitle">Your blanket projects, now on the web</h2>
        <p className="pageCopy">
          The web app uses the same weather, temperature, and yarn logic as mobile,
          with a wider workspace for planning and row tracking.
        </p>
        {!configured ? (
          <div className="banner info">
            Supabase is not configured yet, so this web app is running in demo/local mode.
          </div>
        ) : null}
        {error ? <div className="banner danger">{error}</div> : null}
      </section>

      <div className="toolbar">
        <Link className="primaryButton" href="/app/projects/new">
          Create Project
        </Link>
      </div>

      {initializing ? <div className="card">Loading projects…</div> : null}

      {!initializing && activeProjects.length === 0 ? (
        <div className="card">
          <h3 className="sectionTitle">No active projects yet</h3>
          <p className="mutedText">
            Create your first web project to fetch weather, map yarn colors, and
            track your blanket row by row.
          </p>
        </div>
      ) : null}

      <div className="projectGrid">
        {activeProjects.map((project) => {
          const completion = getProjectCompletion(project.id, data.progressRows);

          return (
            <article className="projectCard" key={project.id}>
              <div className="stackSm">
                <p className="eyebrow">{project.locationName}</p>
                <h3 className="projectTitle">{project.name}</h3>
                <p className="mutedText">
                  {project.startDate} to {project.endDate}
                </p>
                <p className="mutedText">
                  {completion.completed} of {completion.total} rows complete
                </p>
              </div>
              <div className="projectActions">
                <Link className="secondaryButton" href={`/app/projects/${project.id}/preview`}>
                  Preview
                </Link>
                <Link className="secondaryButton" href={`/app/projects/${project.id}/build`}>
                  Build
                </Link>
                <Link className="secondaryButton" href={`/app/projects/${project.id}/settings`}>
                  Settings
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      {archivedProjects.length > 0 ? (
        <section className="card stackMd">
          <h3 className="sectionTitle">Archived projects</h3>
          {archivedProjects.map((project) => (
            <div className="archivedRow" key={project.id}>
              <div>
                <strong>{project.name}</strong>
                <p className="mutedText">{project.locationName}</p>
              </div>
              <Link className="secondaryButton" href={`/app/projects/${project.id}/settings`}>
                Open
              </Link>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
