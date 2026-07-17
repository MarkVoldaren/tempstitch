"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  applyYarnRecommendationsToRanges, autoGenerateRanges, chooseYarnRecommendationForRange,
  detectAdjacentRecommendationConflicts, fillBlankRangeLabels, formatTemperature, getColorUsage,
  getRangeYarnSuggestions, getRecommendedYarnColorForRange, getTemperatureSpan, normalizeAdjacentRanges,
  reorderRanges, validateRanges, yarnCatalogService, type ColorScaleMode, type RecommendationMode,
  type TemperatureDay, type TemperatureRangeColor, type YarnRecommendation,
} from "@temperature-blanket/core";
import { useAppData } from "@/providers/AppDataProvider";
import { useProjectWorkspace } from "@/hooks/useProjectWorkspace";
import { useTheme } from "@/providers/ThemeProvider";
import { Banner, ConfirmDialog, ProgressHeader, SegmentedControl, Toast, YarnSwatch } from "./WebUi";

const locationMarkerColors = ["#3F6B59", "#C86F4B", "#54739A", "#A0678A", "#9A7A38", "#4D8C8A", "#8B654E", "#6C6FA4", "#7A8C4D", "#B65D62", "#537C66", "#8C6A9A"];

function ProjectHeader({ projectId, title }: { projectId: string; title: string }) {
  const { project } = useProjectWorkspace(projectId);
  return <header className="detailHeader"><div><p className="eyebrow">{project?.name}</p><h2 className="pageTitle">{title}</h2></div><Link className="ghostButton" href="/app/projects">All projects</Link></header>;
}

export function ProjectColorView({ projectId }: { projectId: string }) {
  const { saveRanges } = useAppData();
  const workspace = useProjectWorkspace(projectId);
  const project = workspace.project;
  const [ranges, setRanges] = useState(() => workspace.ranges.map((range) => ({ ...range })));
  const [activeLocationId, setActiveLocationId] = useState<string | null>(project?.colorScaleMode === "per-location" ? workspace.locations[0]?.id ?? null : null);
  const [allowGaps, setAllowGaps] = useState(project?.allowRangeGaps ?? false);
  const [suggestionRangeId, setSuggestionRangeId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => { if (!ranges.length && workspace.ranges.length) setRanges(workspace.ranges.map((range) => ({ ...range }))); }, [ranges.length, workspace.ranges]);
  if (!project) return <div className="card">Project not found.</div>;
  const activeProject = project;

  const scopes = project.colorScaleMode === "per-location" ? workspace.locations.map((location) => location.id) : [null];
  const scopeRanges = ranges.filter((range) => range.projectLocationId === activeLocationId);
  const scopeDays = activeLocationId ? workspace.days.filter((day) => day.projectLocationId === activeLocationId) : workspace.days;
  const span = getTemperatureSpan(scopeDays);
  const validation = validateRanges(scopeRanges, span, allowGaps);
  const allValid = scopes.every((scope) => {
    const scopedRanges = ranges.filter((range) => range.projectLocationId === scope);
    const scopedDays = scope ? workspace.days.filter((day) => day.projectLocationId === scope) : workspace.days;
    return scopedRanges.length > 0 && validateRanges(scopedRanges, getTemperatureSpan(scopedDays), allowGaps).isValid;
  });
  const conflicts = detectAdjacentRecommendationConflicts(scopeRanges);
  const activeRange = ranges.find((range) => range.id === suggestionRangeId) ?? null;
  const suggestions = activeRange ? getRangeYarnSuggestions(activeRange, project.preferredYarnBrandId) : [];

  function replaceScope(next: TemperatureRangeColor[]) {
    setRanges((current) => [...current.filter((range) => range.projectLocationId !== activeLocationId), ...next]);
  }
  function generate(count: number) {
    replaceScope(applyYarnRecommendationsToRanges(autoGenerateRanges(projectId, span ?? { min: 0, max: 100 }, count, activeLocationId),
      { brandId: activeProject.preferredYarnBrandId, recommendationMode: activeProject.recommendationMode, preserveLocked: false }));
  }
  function refresh(profile: "balanced" | "strong-separation" = "balanced") {
    replaceScope(applyYarnRecommendationsToRanges(scopeRanges, { brandId: activeProject.preferredYarnBrandId,
      recommendationMode: activeProject.recommendationMode, preserveLocked: true, profile }));
  }
  function update(id: string, next: Partial<TemperatureRangeColor>) {
    setRanges((current) => current.map((range) => range.id === id ? { ...range, ...next } : range));
  }
  async function save() {
    if (!allValid) return;
    await saveRanges(projectId, fillBlankRangeLabels(ranges), allowGaps);
    setMessage("Color mapping saved and every blanket row was remapped.");
  }

  return <div className="stackLg"><ProjectHeader projectId={projectId} title="Color studio"/>
    {project.colorScaleMode === "per-location" ? <div className="locationTabs">{workspace.locations.map((location) => <button className={activeLocationId === location.id ? "chip active" : "chip"} key={location.id} onClick={() => setActiveLocationId(location.id)} type="button">{location.locationName}</button>)}</div> : <Banner tone="info">Shared Colors is active. This scale applies to every location.</Banner>}
    <section className="card stackMd"><div className="sectionHeading"><div><h3 className="sectionTitle">Live legend</h3><p className="mutedText">Target colors stay exact; yarn matches appear as companion swatches.</p></div><span className="sourceBadge">{workspace.yarnBrand?.name ?? "Manual colors"}</span></div>
      <div className="legendBar">{scopeRanges.map((range) => <div key={range.id} style={{ backgroundColor: range.hexColor }} title={`${range.label}: ${range.yarnName}`}/>)}</div>
      <div className="inlineActions"><button className="secondaryButton" onClick={() => generate(8)} type="button">8 bands</button><button className="secondaryButton" onClick={() => generate(10)} type="button">10 bands</button><button className="secondaryButton" onClick={() => generate(12)} type="button">12 bands</button><button className="ghostButton" onClick={() => replaceScope(normalizeAdjacentRanges(scopeRanges))} type="button">Normalize ranges</button>{project.preferredYarnBrandId ? <><button className="ghostButton" onClick={() => refresh()} type="button">Refresh yarn matches</button><button className="ghostButton" onClick={() => refresh("strong-separation")} type="button">Improve differentiation</button></> : null}</div>
    </section>
    {!validation.isValid ? <Banner tone="danger">{[...validation.overlaps, ...validation.gaps].join(" · ")}</Banner> : null}
    {validation.outOfSpan ? <Banner tone="warning">Some temperatures for this location fall outside these ranges.</Banner> : null}
    {conflicts.length ? <Banner tone="warning">{conflicts.length} adjacent yarn match conflict{conflicts.length === 1 ? "" : "s"}.</Banner> : null}
    <label className="toggleRow"><input checked={allowGaps} onChange={(event) => setAllowGaps(event.target.checked)} type="checkbox"/><span><strong>Allow intentional gaps</strong><small>Uncovered temperatures appear as unmapped.</small></span></label>
    <div className="stackMd">{scopeRanges.map((range, index) => {
      const yarn = getRecommendedYarnColorForRange(range); const brand = yarn ? yarnCatalogService.getBrandById(yarn.brandId) : null;
      return <article className="rangeEditor" draggable key={range.id} onDragStart={() => setDragIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragIndex !== null) replaceScope(reorderRanges(scopeRanges, dragIndex, index)); setDragIndex(null); }}>
        <div className="dragHandle" title="Drag to reorder">::</div><div className="colorPair"><input aria-label={`Color for ${range.label}`} type="color" value={range.hexColor} onChange={(event) => update(range.id, { hexColor: event.target.value.toUpperCase(), userOverrodeRecommendation: true, lockedToRecommendedYarn: false })}/><input className="input hexInput" value={range.hexColor} onChange={(event) => update(range.id, { hexColor: event.target.value, userOverrodeRecommendation: true, lockedToRecommendedYarn: false })}/></div>
        <div className="rangeFields"><label>Min<input className="input" type="number" value={range.minTemp} onChange={(event) => update(range.id, { minTemp: Number(event.target.value) })}/></label><label>Max<input className="input" type="number" value={range.maxTemp} onChange={(event) => update(range.id, { maxTemp: Number(event.target.value) })}/></label><label>Label<input className="input" value={range.label} onChange={(event) => update(range.id, { label: event.target.value })}/></label><label>Yarn name<input className="input" value={range.yarnName} onChange={(event) => update(range.id, { yarnName: event.target.value, userOverrodeRecommendation: true })}/></label><label className="wide">Notes<input className="input" value={range.notes ?? ""} onChange={(event) => update(range.id, { notes: event.target.value })}/></label></div>
        <div className="recommendation"><YarnSwatch targetColor={range.hexColor} color={yarn?.hex}/><div><strong>{yarn?.name ?? "Manual color"}</strong><small>{brand?.name ?? "No brand recommendation"}</small></div>{project.preferredYarnBrandId ? <button className="ghostButton compact" onClick={() => setSuggestionRangeId(range.id)} type="button">Alternates</button> : null}<button className="iconButton" disabled={scopeRanges.length === 1} onClick={() => setRanges((current) => current.filter((item) => item.id !== range.id))} type="button" aria-label={`Delete ${range.label}`}>×</button></div>
      </article>;
    })}</div>
    <button className="secondaryButton addBand" onClick={() => { const last = scopeRanges.at(-1); setRanges((current) => [...current, { ...autoGenerateRanges(projectId, { min: last ? last.maxTemp + 1 : 0, max: last ? last.maxTemp + 10 : 10 }, 1, activeLocationId)[0], id: `${projectId}:range:${Date.now()}`, sortOrder: scopeRanges.length }]); }} type="button">Add color band</button>
    <div className="stickyActions"><button className="primaryButton" disabled={!allValid} onClick={() => void save()} type="button">Save colors & preview</button><Link className="ghostButton" href={`/app/projects/${projectId}/preview`}>Open preview</Link></div>
    {activeRange ? <div className="dialogBackdrop"><div className="dialogCard stackMd" role="dialog" aria-modal="true"><div className="sectionHeading"><h3 className="sectionTitle">Yarn suggestions</h3><button className="iconButton" onClick={() => setSuggestionRangeId(null)} type="button">×</button></div>{suggestions.map((suggestion: YarnRecommendation) => <button className="yarnOption" key={suggestion.yarnColorId} onClick={() => { update(activeRange.id, chooseYarnRecommendationForRange(activeRange, suggestion)); setSuggestionRangeId(null); }} type="button"><YarnSwatch targetColor={activeRange.hexColor} color={suggestion.hex}/><span><strong>{suggestion.colorName}</strong><small>{suggestion.explanation} · {suggestion.matchQuality} match</small></span></button>)}</div></div> : null}
    <Toast message={message} onDismiss={() => setMessage(null)}/>
  </div>;
}

function LocationLegend({ workspace }: { workspace: ReturnType<typeof useProjectWorkspace> }) {
  return <section className="card stackMd"><div className="sectionHeading"><h3 className="sectionTitle">Location timeline</h3><span className="sourceBadge">{workspace.locations.length} locations</span></div><div className="locationLegend">{workspace.locations.map((location, index) => {
    const days = workspace.days.filter((day) => day.projectLocationId === location.id); const measured = days.filter((day) => day.selectedTemp !== null);
    const warm = measured.reduce<TemperatureDay | null>((best, day) => !best || (day.selectedTemp ?? -Infinity) > (best.selectedTemp ?? -Infinity) ? day : best, null);
    const cold = measured.reduce<TemperatureDay | null>((best, day) => !best || (day.selectedTemp ?? Infinity) < (best.selectedTemp ?? Infinity) ? day : best, null);
    return <div className="locationLegendItem" key={location.id}><span className="locationDot" style={{ backgroundColor: locationMarkerColors[index % locationMarkerColors.length] }}/><div><strong>{location.locationName}</strong><small>{location.startDate} to {location.endDate} · {days.length} rows</small><small>Low {formatTemperature(cold?.selectedTemp ?? null, workspace.project?.unit ?? "fahrenheit")} · High {formatTemperature(warm?.selectedTemp ?? null, workspace.project?.unit ?? "fahrenheit")}</small></div><span className={`sourceBadge ${location.weatherSource}`}>{location.weatherSourceLabel}</span></div>;
  })}</div></section>;
}

export function ProjectPreviewView({ projectId }: { projectId: string }) {
  const workspace = useProjectWorkspace(projectId); const project = workspace.project;
  const [mode, setMode] = useState<"full" | "detail" | "heatmap">("full"); const [texture, setTexture] = useState<"flat" | "stitch">("stitch");
  const [zoom, setZoom] = useState(1); const [selectedDate, setSelectedDate] = useState(workspace.days[0]?.date ?? null);
  if (!project) return <div className="card">Project not found.</div>;
  const activeProject = project;
  const selectedDay = workspace.days.find((day) => day.date === selectedDate) ?? workspace.days[0];
  const selectedRange = selectedDay?.mappedRangeId ? workspace.rangeById.get(selectedDay.mappedRangeId) : null;
  const selectedYarn = selectedRange ? getRecommendedYarnColorForRange(selectedRange) : null;
  const selectedLocation = selectedDay ? workspace.locationById.get(selectedDay.projectLocationId) : null;
  const measured = workspace.days.filter((day) => day.selectedTemp !== null);
  const warmest = measured.reduce<TemperatureDay | null>((best, day) => !best || (day.selectedTemp ?? -Infinity) > (best.selectedTemp ?? -Infinity) ? day : best, null);
  const coldest = measured.reduce<TemperatureDay | null>((best, day) => !best || (day.selectedTemp ?? Infinity) < (best.selectedTemp ?? Infinity) ? day : best, null);
  const usage = getColorUsage(workspace.days);
  return <div className="stackLg"><ProjectHeader projectId={projectId} title="Blanket preview"/><div className="previewToolbar"><SegmentedControl value={mode} onChange={setMode} options={[{ label: "Full", value: "full" }, { label: "Row detail", value: "detail" }, { label: "Year heatmap", value: "heatmap" }]}/><SegmentedControl value={texture} onChange={setTexture} options={[{ label: "Flat", value: "flat" }, { label: "Stitched", value: "stitch" }]}/><div className="zoomControl"><button onClick={() => setZoom((value) => Math.max(.5, value - .25))}>-</button><span>{Math.round(zoom * 100)}%</span><button onClick={() => setZoom((value) => Math.min(3, value + .25))}>+</button></div></div>
    {workspace.unmappedCount ? <Banner tone="warning">{workspace.unmappedCount} rows are unmapped. Adjust color ranges before building.</Banner> : null}
    <div className="statsGrid"><div className="statCard"><span>Total rows</span><strong>{workspace.days.length}</strong><small>{workspace.locations.length} locations</small></div><div className="statCard"><span>Warmest</span><strong>{formatTemperature(warmest?.selectedTemp ?? null, project.unit)}</strong><small>{warmest?.date}</small></div><div className="statCard"><span>Coldest</span><strong>{formatTemperature(coldest?.selectedTemp ?? null, project.unit)}</strong><small>{coldest?.date}</small></div><div className="statCard"><span>Mapped</span><strong>{workspace.days.length - workspace.unmappedCount}</strong><small>{workspace.unmappedCount} unmapped</small></div></div>
    <section className="card previewStage">{mode === "heatmap" ? <div className="heatmap">{workspace.days.map((day) => { const location = workspace.locationById.get(day.projectLocationId); return <button aria-label={`${day.date}, ${location?.locationName}, ${formatTemperature(day.selectedTemp, project.unit)}`} key={day.id} onClick={() => { setSelectedDate(day.date); setMode("detail"); }} style={{ backgroundColor: day.mappedColor ?? "var(--warning)" }} title={`${day.date} · ${location?.locationName} · ${formatTemperature(day.selectedTemp, project.unit)}`}/>; })}</div> : mode === "detail" ? <div className="rowDetailList">{workspace.days.map((day) => { const location = workspace.locationById.get(day.projectLocationId); return <button className={day.date === selectedDate ? "detailRow active" : "detailRow"} key={day.id} onClick={() => setSelectedDate(day.date)}><span className={`rowRibbon ${texture}`} style={{ backgroundColor: day.mappedColor ?? "var(--warning)" }}/><span>{day.date}<small>{location?.locationName}{workspace.transitionDates.has(day.date) ? " · New location" : ""}</small></span><strong>{formatTemperature(day.selectedTemp, project.unit)}</strong></button>; })}</div> : <div className={`blanketCanvas ${project.previewOrientation} ${texture}`} style={{ transform: `scale(${zoom})`, transformOrigin: "top left", width: `${100 / zoom}%` }}>{workspace.days.map((day, index) => { const previous = workspace.days[index - 1]; const monthChanged = day.date.slice(0, 7) !== previous?.date.slice(0, 7); const location = workspace.locationById.get(day.projectLocationId); return <button className="blanketRow" key={day.id} onClick={() => setSelectedDate(day.date)} style={{ backgroundColor: day.mappedColor ?? "var(--warning)", height: Math.max(2, project.rowHeight / 3) }} title={`${day.date} · ${location?.locationName}`}>{workspace.transitionDates.has(day.date) ? <span className="locationMarker">{location?.locationName}</span> : monthChanged ? <span className="monthMarker">{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { month: "short" })}</span> : null}</button>; })}</div>}</section>
    {selectedDay ? <section className="card selectedRowCard"><YarnSwatch targetColor={selectedDay.mappedColor ?? "#FBBF24"} color={selectedYarn?.hex}/><div><p className="eyebrow">{selectedLocation?.locationName ?? "Selected row"}</p><h3 className="sectionTitle">{new Date(`${selectedDay.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</h3><p className="mutedText">{formatTemperature(selectedDay.selectedTemp, project.unit)} · {selectedRange?.label ?? "Unmapped"} · {selectedYarn ? `${workspace.yarnBrand?.name} ${selectedYarn.name}` : selectedRange?.yarnName ?? "No yarn assigned"}</p></div></section> : null}
    <LocationLegend workspace={workspace}/>
    <section className="card stackMd"><h3 className="sectionTitle">Palette & row counts</h3><div className="usageGrid">{workspace.ranges.map((range) => { const yarn = getRecommendedYarnColorForRange(range); const location = range.projectLocationId ? workspace.locationById.get(range.projectLocationId) : null; return <div className="usageCard" key={range.id}><YarnSwatch targetColor={range.hexColor} color={yarn?.hex}/><span><strong>{range.label}</strong><small>{location ? `${location.locationName} · ` : ""}{yarn?.name ?? range.yarnName}</small></span><b>{usage[range.hexColor] ?? 0}</b></div>; })}</div></section>
    <div className="stickyActions"><Link className="primaryButton" href={`/app/projects/${projectId}/build`}>Enter build mode</Link><Link className="secondaryButton" href={`/app/projects/${projectId}/colors`}>Edit colors</Link><Link className="ghostButton" href={`/app/projects/${projectId}/settings`}>Settings</Link></div>
  </div>;
}

export function ProjectBuildView({ projectId }: { projectId: string }) {
  const { toggleRowCompleted } = useAppData(); const workspace = useProjectWorkspace(projectId); const project = workspace.project;
  const [display, setDisplay] = useState<"queue" | "focus">("focus"); const [filter, setFilter] = useState<"next" | "completed">("next");
  const [toast, setToast] = useState<{ message: string; rowId: string } | null>(null);
  if (!project) return <div className="card">Project not found.</div>;
  const activeProject = project;
  const incomplete = workspace.progressRows.filter((row) => !row.completed).slice(0, 5); const completed = workspace.progressRows.filter((row) => row.completed).reverse();
  const visible = filter === "next" ? incomplete : completed;
  async function toggle(rowId: string, value: boolean) { await toggleRowCompleted(projectId, rowId, value); if (value) setToast({ message: "Row marked complete.", rowId }); }
  function renderRow(row: (typeof workspace.progressRows)[number], featured = false) {
    const day = workspace.dayByDate.get(row.date); const range = day?.mappedRangeId ? workspace.rangeById.get(day.mappedRangeId) : null;
    const yarn = range ? getRecommendedYarnColorForRange(range) : null; const location = day ? workspace.locationById.get(day.projectLocationId) : null;
    return <article className={`queueRow ${featured ? "featured" : ""}`} key={row.id}><button className={row.completed ? "completeToggle checked" : "completeToggle"} onClick={() => void toggle(row.id, !row.completed)} type="button" aria-label={`${row.completed ? "Uncheck" : "Complete"} row ${row.rowNumber}`}>{row.completed ? "✓" : ""}</button><span className="queueSwatch" style={{ backgroundColor: day?.mappedColor ?? "var(--warning)" }}/><div className="queueMain"><span className="eyebrow">Row {row.rowNumber}{workspace.transitionDates.has(row.date) ? " · New location" : ""}</span><strong>{new Date(`${row.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</strong><small className="rowLocation">{location?.locationName}</small><small>{yarn ? `${workspace.yarnBrand?.name} · ${yarn.name}` : range?.yarnName ?? "Unmapped yarn"}</small></div><div className="queueMeta"><strong>{formatTemperature(day?.selectedTemp ?? null, activeProject.unit)}</strong><span>{activeProject.stitchName}</span></div></article>;
  }
  return <div className="stackLg"><ProjectHeader projectId={projectId} title="Build mode"/><ProgressHeader {...workspace.completion}/><div className="buildControls"><SegmentedControl value={display} onChange={setDisplay} options={[{ label: "Queue mode", value: "queue" }, { label: "Focus mode", value: "focus" }]}/><SegmentedControl value={filter} onChange={setFilter} options={[{ label: "Next rows", value: "next" }, { label: "Completed", value: "completed" }]}/></div>{filter === "next" && !visible.length ? <Banner tone="success">Every row is complete. Your blanket forecast is finished.</Banner> : null}<section className={display === "focus" && filter === "next" ? "focusQueue" : "queueList"}>{visible.map((row, index) => renderRow(row, display === "focus" && filter === "next" && index === 0))}</section>{filter === "next" && incomplete[0] ? <div className="stickyActions buildSticky"><button className="primaryButton wideButton" onClick={() => void toggle(incomplete[0].id, true)} type="button">Mark row {incomplete[0].rowNumber} complete</button><button className="ghostButton" onClick={() => document.querySelector(".queueRow")?.scrollIntoView({ behavior: "smooth" })} type="button">Jump to first incomplete</button></div> : null}<Toast message={toast?.message ?? null} onDismiss={() => setToast(null)} action={toast ? { label: "Undo", run: () => { void toggleRowCompleted(projectId, toast.rowId, false); setToast(null); } } : undefined}/></div>;
}

export function ProjectSettingsView({ projectId }: { projectId: string }) {
  const router = useRouter(); const workspace = useProjectWorkspace(projectId); const project = workspace.project;
  const { archiveProject, deleteProject, duplicateProject, exportProjectJson, resetProjectProgress, restoreProject, resyncProjectWeather, saveProject } = useAppData();
  const { mode, setMode } = useTheme(); const [confirm, setConfirm] = useState<"reset" | "archive" | "delete" | null>(null);
  const [message, setMessage] = useState<string | null>(null); const [mergeSourceId, setMergeSourceId] = useState(workspace.locations[0]?.id ?? "");
  if (!project) return <div className="card">Project not found.</div>;
  const activeProject = project;
  const brands = yarnCatalogService.getBrands();
  const baseDraft = (ranges: TemperatureRangeColor[], colorScaleMode: ColorScaleMode, brandId = activeProject.preferredYarnBrandId ?? null, recommendationMode = activeProject.recommendationMode) => ({
    id: activeProject.id, name: activeProject.name, locations: workspace.locations.map((location) => ({ id: location.id, sortOrder: location.sortOrder, startDate: location.startDate, endDate: location.endDate, location: { query: location.locationName, name: location.locationName, latitude: location.latitude, longitude: location.longitude } })), unit: activeProject.unit, tempMode: activeProject.tempMode, startDate: activeProject.startDate, endDate: activeProject.endDate, stitchesPerRow: activeProject.stitchesPerRow, rowHeight: activeProject.rowHeight, craftType: activeProject.craftType, stitchName: activeProject.stitchName, previewOrientation: activeProject.previewOrientation, notes: activeProject.notes, allowRangeGaps: activeProject.allowRangeGaps, preferredYarnBrandId: brandId, recommendationMode, colorScaleMode, ranges,
  });
  async function updateYarn(brandId: string | null, recommendationMode: RecommendationMode) { await saveProject(baseDraft(workspace.ranges, activeProject.colorScaleMode, brandId, recommendationMode)); setMessage("Yarn preferences updated."); }
  async function useSeparateColors() { const shared = workspace.sharedRanges; const ranges = workspace.locations.flatMap((location) => shared.map((range) => ({ ...range, id: `${location.id}:range:${range.sortOrder + 1}`, projectLocationId: location.id }))); await saveProject(baseDraft(ranges, "per-location")); setMessage("Separate palettes created from the shared colors."); }
  async function mergeSharedColors() { const source = workspace.rangesByLocation.get(mergeSourceId) ?? []; const ranges = source.map((range) => ({ ...range, id: `${projectId}:range:${range.sortOrder + 1}`, projectLocationId: null })); await saveProject(baseDraft(ranges, "shared")); setMessage("Selected location palette is now shared."); }
  function download() { const blob = new Blob([exportProjectJson(projectId)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${activeProject.name.replace(/\s+/g, "-").toLowerCase()}.json`; anchor.click(); URL.revokeObjectURL(url); }
  return <div className="stackLg"><ProjectHeader projectId={projectId} title="Project settings"/>{project.weatherStatusMessage ? <Banner tone={project.weatherSource === "mock" ? "warning" : "info"}>{project.weatherStatusMessage}</Banner> : null}<div className="settingsGrid">
    <section className="card stackMd"><h3 className="sectionTitle">Project details</h3><dl className="detailsList"><div><dt>Locations</dt><dd>{workspace.locations.length}</dd></div><div><dt>Date range</dt><dd>{project.startDate} to {project.endDate}</dd></div><div><dt>Temperature</dt><dd>{project.tempMode} · {project.unit}</dd></div><div><dt>Craft</dt><dd>{project.craftType} · {project.stitchName}</dd></div><div><dt>Rows</dt><dd>{project.stitchesPerRow} stitches</dd></div></dl><div className="inlineActions"><Link className="primaryButton" href={`/app/projects/${projectId}/edit`}>Edit project & timeline</Link><button className="secondaryButton" onClick={() => void resyncProjectWeather(projectId).then(() => setMessage("All weather data refreshed."))} type="button">Re-sync all weather</button><Link className="ghostButton" href={`/app/projects/${projectId}/colors`}>Edit colors</Link></div></section>
    <section className="card stackMd"><h3 className="sectionTitle">Color scale mode</h3><p className="mutedText">{project.colorScaleMode === "shared" ? "One scale is used for every location." : "Each location has its own scale."}</p>{project.colorScaleMode === "shared" ? <button className="secondaryButton" onClick={() => void useSeparateColors()} type="button">Use separate colors by location</button> : <><label className="field"><span>Palette to keep when merging</span><select className="input" value={mergeSourceId} onChange={(event) => setMergeSourceId(event.target.value)}>{workspace.locations.map((location) => <option key={location.id} value={location.id}>{location.locationName}</option>)}</select></label><button className="secondaryButton" onClick={() => void mergeSharedColors()} type="button">Use selected palette as shared</button></>}</section>
    <section className="card stackMd"><h3 className="sectionTitle">Yarn recommendations</h3><label className="field"><span>Preferred brand</span><select className="input" value={project.preferredYarnBrandId ?? ""} onChange={(event) => void updateYarn(event.target.value || null, project.recommendationMode)}><option value="">No preferred brand</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label><SegmentedControl label="Recommendation mode" value={project.recommendationMode} onChange={(value) => void updateYarn(project.preferredYarnBrandId ?? null, value)} options={[{ label: "Nearest", value: "exact-nearest" }, { label: "Brand palette", value: "brand-palette-only" }, { label: "Manual", value: "manual-only" }]}/></section>
    <section className="card stackMd"><h3 className="sectionTitle">Appearance</h3><SegmentedControl label="Theme" value={mode} onChange={setMode} options={[{ label: "System", value: "system" }, { label: "Light", value: "light" }, { label: "Dark", value: "dark" }]}/></section>
    <section className="card stackMd"><h3 className="sectionTitle">Project data</h3><button className="secondaryButton" onClick={download} type="button">Download project JSON</button><button className="secondaryButton" onClick={() => void duplicateProject(projectId).then((id) => router.push(`/app/projects/${id}/preview`))} type="button">Duplicate project</button><button className="ghostButton" onClick={() => setConfirm("reset")} type="button">Reset completion progress</button><button className="ghostButton" onClick={() => setConfirm("archive")} type="button">{project.archivedAt ? "Restore project" : "Archive project"}</button><button className="dangerButton" onClick={() => setConfirm("delete")} type="button">Delete project permanently</button></section>
  </div><section className="card stackMd"><h3 className="sectionTitle">Location weather sources</h3><div className="locationLegend">{workspace.locations.map((location, index) => <div className="locationLegendItem" key={location.id}><span className="locationDot" style={{ backgroundColor: locationMarkerColors[index % locationMarkerColors.length] }}/><div><strong>{location.locationName}</strong><small>{location.startDate} to {location.endDate}</small></div><span className={`sourceBadge ${location.weatherSource}`}>{location.weatherSourceLabel}</span><button className="ghostButton compact" onClick={() => void resyncProjectWeather(projectId, "allowMock", location.id).then(() => setMessage(`${location.locationName} refreshed.`))} type="button">Re-sync</button></div>)}</div></section>
    <ConfirmDialog open={confirm === "reset"} title="Reset progress?" message="This clears every completed-row checkmark." confirmLabel="Reset progress" danger onCancel={() => setConfirm(null)} onConfirm={async () => { await resetProjectProgress(projectId); setConfirm(null); setMessage("Progress reset."); }}/><ConfirmDialog open={confirm === "archive"} title={project.archivedAt ? "Restore project?" : "Archive project?"} message={project.archivedAt ? "This project will return to the active list." : "The project remains saved and can be restored later."} confirmLabel={project.archivedAt ? "Restore" : "Archive"} onCancel={() => setConfirm(null)} onConfirm={async () => { if (project.archivedAt) await restoreProject(projectId); else await archiveProject(projectId); setConfirm(null); router.push("/app/projects"); }}/><ConfirmDialog open={confirm === "delete"} title="Delete project permanently?" message="Weather, colors, locations, and progress will be removed. This cannot be undone." confirmLabel="Delete project" danger onCancel={() => setConfirm(null)} onConfirm={async () => { await deleteProject(projectId); router.push("/app/projects"); }}/><Toast message={message} onDismiss={() => setMessage(null)}/>
  </div>;
}
