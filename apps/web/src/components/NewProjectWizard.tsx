"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDays, applyYarnRecommendationsToRanges, autoGenerateRanges, compareIsoDates,
  getProjectLocations, getProjectRanges, getTemperatureSpan, MAX_PROJECT_LOCATIONS,
  validateLocationTimeline, yarnCatalogService, type FetchWeatherResult,
  type LocatedWeatherDayRecord, type LocationSuggestion, type ProjectDraftInput,
  type ProjectLocationDraft, type TemperatureRangeColor,
} from "@temperature-blanket/core";
import { useAppData } from "@/providers/AppDataProvider";

const steps = ["Project basics", "Dates + temperature", "Location timeline", "Stitch settings", "Color ranges", "Review + create"] as const;
type DraftState = ProjectDraftInput & { bandCount: number };
type LocationEdit = { type: "replace" | "split"; index: number } | null;

function midpoint(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T12:00:00`).getTime();
  const end = new Date(`${endDate}T12:00:00`).getTime();
  return new Date(start + Math.max(86400000, Math.floor((end - start) / 2))).toISOString().slice(0, 10);
}

export function NewProjectWizard({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const { data, saveProject, searchLocations, previewWeather } = useAppData();
  const existingProject = data.projects.find((project) => project.id === projectId);
  const existingRanges = projectId ? getProjectRanges(projectId, data.ranges) : [];
  const existingLocations = projectId ? getProjectLocations(projectId, data.projectLocations) : [];
  const defaultStart = existingProject?.startDate ?? `${new Date().getFullYear() - 1}-01-01`;
  const defaultEnd = existingProject?.endDate ?? `${new Date().getFullYear() - 1}-12-31`;
  const [step, setStep] = useState(0);
  const [rangeMode, setRangeMode] = useState<"fullYear" | "custom">("fullYear");
  const [locationEdit, setLocationEdit] = useState<LocationEdit>(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<LocationSuggestion[]>([]);
  const [splitDate, setSplitDate] = useState(defaultStart);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherPreview, setWeatherPreview] = useState<FetchWeatherResult | null>(null);
  const [confirmRegeneration, setConfirmRegeneration] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<DraftState>({
    id: existingProject?.id, name: existingProject?.name ?? "", unit: existingProject?.unit ?? "fahrenheit",
    tempMode: existingProject?.tempMode ?? "avg", startDate: defaultStart, endDate: defaultEnd,
    locations: existingLocations.map((location) => ({ id: location.id, sortOrder: location.sortOrder,
      startDate: location.startDate, endDate: location.endDate,
      location: { query: location.locationName, name: location.locationName, latitude: location.latitude, longitude: location.longitude } })),
    stitchesPerRow: existingProject?.stitchesPerRow ?? 180, rowHeight: existingProject?.rowHeight ?? 12,
    craftType: existingProject?.craftType ?? "crochet", stitchName: existingProject?.stitchName ?? "Single crochet",
    previewOrientation: existingProject?.previewOrientation ?? "horizontal", notes: existingProject?.notes ?? "",
    allowRangeGaps: existingProject?.allowRangeGaps ?? false, preferredYarnBrandId: existingProject?.preferredYarnBrandId ?? null,
    recommendationMode: existingProject?.recommendationMode ?? "exact-nearest",
    colorScaleMode: existingProject?.colorScaleMode ?? "shared", ranges: existingRanges, bandCount: existingRanges.length || 8,
  });
  const draftKey = `tempstitch:setup-draft:${projectId ?? "new"}`;

  useEffect(() => { const raw = window.sessionStorage.getItem(draftKey); if (raw) try {
    const parsed = JSON.parse(raw) as Partial<DraftState> & { location?: ProjectLocationDraft["location"] };
    setDraft((current) => ({ ...current, ...parsed,
      colorScaleMode: parsed.colorScaleMode ?? "shared",
      locations: parsed.locations ?? (parsed.location ? [{ id: `draft-location-${Date.now()}`, location: parsed.location, startDate: parsed.startDate ?? current.startDate, endDate: parsed.endDate ?? current.endDate, sortOrder: 0 }] : current.locations) }));
  } catch { window.sessionStorage.removeItem(draftKey); } }, [draftKey]);
  useEffect(() => {
    if (!existingProject || draft.id) return;
    setDraft((current) => ({ ...current, id: existingProject.id, name: existingProject.name,
      unit: existingProject.unit, tempMode: existingProject.tempMode, startDate: existingProject.startDate,
      endDate: existingProject.endDate, locations: existingLocations.map((location) => ({ id: location.id,
        sortOrder: location.sortOrder, startDate: location.startDate, endDate: location.endDate,
        location: { query: location.locationName, name: location.locationName, latitude: location.latitude, longitude: location.longitude } })),
      stitchesPerRow: existingProject.stitchesPerRow, rowHeight: existingProject.rowHeight,
      craftType: existingProject.craftType, stitchName: existingProject.stitchName,
      previewOrientation: existingProject.previewOrientation, notes: existingProject.notes ?? "",
      allowRangeGaps: existingProject.allowRangeGaps, preferredYarnBrandId: existingProject.preferredYarnBrandId,
      recommendationMode: existingProject.recommendationMode, colorScaleMode: existingProject.colorScaleMode,
      ranges: existingRanges, bandCount: existingRanges.length || 8 }));
  }, [draft.id, existingLocations, existingProject, existingRanges]);
  useEffect(() => { window.sessionStorage.setItem(draftKey, JSON.stringify(draft)); }, [draft, draftKey]);

  const timelineValidation = useMemo(() => validateLocationTimeline(draft.locations, draft.startDate, draft.endDate), [draft.endDate, draft.locations, draft.startDate]);
  const previewDays = (weatherPreview?.daily ?? []) as LocatedWeatherDayRecord[];
  const reviewRanges = useMemo<TemperatureRangeColor[]>(() => {
    if (!draft.locations.length) return [];
    const existingMatchesMode = existingRanges.some((range) => range.projectLocationId !== null) === (draft.colorScaleMode === "per-location");
    if (existingMatchesMode && existingRanges.length) return existingRanges;
    const generated = draft.colorScaleMode === "shared"
      ? autoGenerateRanges("preview-project", getTemperatureSpan(previewDays) ?? { min: 0, max: 100 }, draft.bandCount)
      : draft.locations.flatMap((location) => autoGenerateRanges("preview-project",
          getTemperatureSpan(previewDays.filter((day) => day.projectLocationId === location.id)) ?? { min: 0, max: 100 },
          draft.bandCount, location.id ?? null));
    return applyYarnRecommendationsToRanges(generated, { brandId: draft.preferredYarnBrandId,
      recommendationMode: draft.recommendationMode, preserveLocked: false });
  }, [draft.bandCount, draft.colorScaleMode, draft.locations, draft.preferredYarnBrandId, draft.recommendationMode, existingRanges, previewDays]);

  function setDates(startDate: string, endDate: string) {
    setDraft((current) => ({ ...current, startDate, endDate,
      locations: current.locations.map((location, index, all) => ({ ...location,
        startDate: index === 0 ? startDate : location.startDate,
        endDate: index === all.length - 1 ? endDate : location.endDate })) }));
    setWeatherPreview(null);
  }

  async function runLocationSearch() { setLocationResults(await searchLocations(locationQuery)); }
  function chooseLocation(result: LocationSuggestion) {
    const location = { query: locationQuery, name: result.name, latitude: result.latitude, longitude: result.longitude };
    setDraft((current) => {
      if (!locationEdit) return { ...current, locations: [{ id: `draft-location-${Date.now()}`, location, startDate: current.startDate, endDate: current.endDate, sortOrder: 0 }] };
      if (locationEdit.type === "replace") return { ...current, locations: current.locations.map((item, index) => index === locationEdit.index ? { ...item, location } : item) };
      const target = current.locations[locationEdit.index];
      if (!target || compareIsoDates(splitDate, target.startDate) <= 0 || compareIsoDates(splitDate, target.endDate) > 0) return current;
      const next = current.locations.slice();
      next.splice(locationEdit.index, 1,
        { ...target, endDate: addDays(splitDate, -1) },
        { id: `draft-location-${Date.now()}`, location, startDate: splitDate, endDate: target.endDate, sortOrder: locationEdit.index + 1 });
      return { ...current, locations: next.map((item, index) => ({ ...item, sortOrder: index })) };
    });
    setLocationEdit(null); setLocationQuery(""); setLocationResults([]); setWeatherPreview(null);
  }
  function removeLocation(index: number) {
    setDraft((current) => {
      const next = current.locations.slice(); const removed = next[index]; if (!removed || next.length === 1) return current;
      if (index > 0) next[index - 1] = { ...next[index - 1], endDate: removed.endDate };
      else next[1] = { ...next[1], startDate: removed.startDate };
      next.splice(index, 1); return { ...current, locations: next.map((item, order) => ({ ...item, sortOrder: order })) };
    }); setWeatherPreview(null);
  }
  async function loadPreview(fallbackMode: "none" | "allowMock" | "mockOnly" = "allowMock") {
    setWeatherError(null);
    try { setWeatherPreview(await previewWeather({ ...draft, ranges: reviewRanges }, fallbackMode)); }
    catch (cause) { setWeatherError(cause instanceof Error ? cause.message : "Weather preview failed."); }
  }
  function weatherSettingsChanged() {
    if (!existingProject) return false;
    const before = existingLocations.map((item) => [item.locationName, item.latitude, item.longitude, item.startDate, item.endDate]);
    const after = draft.locations.map((item) => [item.location.name, item.location.latitude, item.location.longitude, item.startDate, item.endDate]);
    return existingProject.startDate !== draft.startDate || existingProject.endDate !== draft.endDate ||
      existingProject.tempMode !== draft.tempMode || existingProject.unit !== draft.unit || JSON.stringify(before) !== JSON.stringify(after);
  }
  async function handleCreate(fallbackMode: "none" | "allowMock" = "none") {
    if (!timelineValidation.isValid) return;
    if (weatherSettingsChanged() && !confirmRegeneration) { setConfirmRegeneration(true); return; }
    setCreating(true); setWeatherError(null);
    try {
      const result = await saveProject({ ...draft, ranges: reviewRanges.map((range, index) => ({ ...range, projectId: draft.id ?? "pending", sortOrder: index })) }, { fallbackMode });
      window.sessionStorage.removeItem(draftKey); router.push(`/app/projects/${result.projectId}/preview`);
    } catch (cause) { setWeatherError(cause instanceof Error ? cause.message : "Unable to save project."); }
    finally { setCreating(false); }
  }

  const canContinue = [draft.name.trim().length > 0, draft.startDate <= draft.endDate, timelineValidation.isValid,
    draft.stitchName.trim().length > 0 && draft.stitchesPerRow > 0, reviewRanges.length > 0, timelineValidation.isValid][step];

  return <div className="stackLg"><section className="card stackMd">
    <div className="stepRow">{steps.map((label, index) => <div className={index === step ? "stepChip active" : "stepChip"} key={label}>{index + 1}. {label}</div>)}</div>
    {step === 0 ? <div className="stackMd"><h2 className="sectionTitle">{existingProject ? "Edit project basics" : "Project basics"}</h2>
      <label className="field"><span>Project name</span><input className="input" value={draft.name} placeholder="2025 Family Blanket" onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}/></label>
      <label className="field"><span>Notes</span><textarea className="input textarea" value={draft.notes ?? ""} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}/></label></div> : null}
    {step === 1 ? <div className="stackMd"><h2 className="sectionTitle">Dates + temperature</h2>
      <div className="segmented"><button className={rangeMode === "fullYear" ? "segment active" : "segment"} onClick={() => { setRangeMode("fullYear"); const year = draft.startDate.slice(0, 4); setDates(`${year}-01-01`, `${year}-12-31`); }} type="button">Full year</button><button className={rangeMode === "custom" ? "segment active" : "segment"} onClick={() => setRangeMode("custom")} type="button">Custom dates</button></div>
      <div className="grid2"><label className="field"><span>Start date</span><input className="input" type="date" value={draft.startDate} onChange={(event) => setDates(event.target.value, draft.endDate)}/></label><label className="field"><span>End date</span><input className="input" type="date" value={draft.endDate} onChange={(event) => setDates(draft.startDate, event.target.value)}/></label></div>
      <div className="grid2"><label className="field"><span>Temperature mode</span><select className="input" value={draft.tempMode} onChange={(event) => setDraft((current) => ({ ...current, tempMode: event.target.value as DraftState["tempMode"] }))}><option value="avg">Daily average</option><option value="high">Daily high</option><option value="low">Daily low</option></select></label><label className="field"><span>Unit</span><select className="input" value={draft.unit} onChange={(event) => setDraft((current) => ({ ...current, unit: event.target.value as DraftState["unit"] }))}><option value="fahrenheit">Fahrenheit</option><option value="celsius">Celsius</option></select></label></div></div> : null}
    {step === 2 ? <div className="stackMd"><div className="sectionHeading"><div><h2 className="sectionTitle">Location timeline</h2><p className="mutedText">Every date belongs to one location. Add another place by splitting an existing date segment.</p></div><span className="sourceBadge">{draft.locations.length} of {MAX_PROJECT_LOCATIONS}</span></div>
      {draft.locations.map((location, index) => <article className="locationTimelineCard" key={location.id ?? index}><span className="locationIndex">{index + 1}</span><div><strong>{location.location.name}</strong><p className="mutedText">{location.startDate} to {location.endDate}</p></div><div className="inlineActions"><button className="ghostButton compact" onClick={() => { setLocationEdit({ type: "replace", index }); setLocationQuery(location.location.name); }} type="button">Change</button>{draft.locations.length < MAX_PROJECT_LOCATIONS && compareIsoDates(location.startDate, location.endDate) < 0 ? <button className="secondaryButton compact" onClick={() => { setLocationEdit({ type: "split", index }); setSplitDate(midpoint(location.startDate, location.endDate)); setLocationQuery(""); }} type="button">Add after</button> : null}{draft.locations.length > 1 ? <button className="ghostButton compact" onClick={() => removeLocation(index)} type="button">Remove</button> : null}</div></article>)}
      {!draft.locations.length || locationEdit ? <section className="locationSearchPanel stackMd"><h3 className="sectionTitle">{locationEdit?.type === "split" ? "Add the next location" : locationEdit ? "Change location" : "Choose the first location"}</h3>{locationEdit?.type === "split" ? <label className="field"><span>New location begins</span><input className="input" type="date" min={addDays(draft.locations[locationEdit.index].startDate, 1)} max={draft.locations[locationEdit.index].endDate} value={splitDate} onChange={(event) => setSplitDate(event.target.value)}/></label> : null}<div className="inlineField"><input className="input" placeholder="Chicago, Illinois" value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)}/><button className="secondaryButton" onClick={() => void runLocationSearch()} type="button">Search</button></div>{locationResults.map((result) => <button className="locationResult" key={result.id} onClick={() => chooseLocation(result)} type="button"><strong>{result.name}</strong><span>{result.latitude.toFixed(3)}, {result.longitude.toFixed(3)}</span></button>)}{locationEdit ? <button className="ghostButton" onClick={() => { setLocationEdit(null); setLocationResults([]); }} type="button">Cancel</button> : null}</section> : null}
      {!timelineValidation.isValid ? <div className="banner warning">{timelineValidation.errors.join(" ")}</div> : null}
      {timelineValidation.isValid ? <button className="secondaryButton" onClick={() => void loadPreview()} type="button">Preview weather for all locations</button> : null}
      {weatherPreview ? <div className="banner success">{weatherPreview.providerLabel}: {weatherPreview.daily.length} daily rows loaded.</div> : null}</div> : null}
    {step === 3 ? <div className="stackMd"><h2 className="sectionTitle">Stitch settings</h2><div className="grid2"><label className="field"><span>Craft type</span><select className="input" value={draft.craftType} onChange={(event) => setDraft((current) => ({ ...current, craftType: event.target.value as DraftState["craftType"] }))}><option value="crochet">Crochet</option><option value="knit">Knit</option></select></label><label className="field"><span>Preview orientation</span><select className="input" value={draft.previewOrientation} onChange={(event) => setDraft((current) => ({ ...current, previewOrientation: event.target.value as DraftState["previewOrientation"] }))}><option value="horizontal">Horizontal rows</option><option value="vertical">Vertical strips</option></select></label><label className="field"><span>Stitch name</span><input className="input" value={draft.stitchName} onChange={(event) => setDraft((current) => ({ ...current, stitchName: event.target.value }))}/></label><label className="field"><span>Stitches per row</span><input className="input" type="number" min={1} value={draft.stitchesPerRow} onChange={(event) => setDraft((current) => ({ ...current, stitchesPerRow: Number(event.target.value) }))}/></label><label className="field"><span>Row thickness</span><input className="input" type="number" min={1} value={draft.rowHeight} onChange={(event) => setDraft((current) => ({ ...current, rowHeight: Number(event.target.value) }))}/></label></div></div> : null}
    {step === 4 ? <div className="stackMd"><h2 className="sectionTitle">Color ranges</h2><div className="grid2"><label className="field"><span>Color scales</span><select className="input" value={draft.colorScaleMode} onChange={(event) => setDraft((current) => ({ ...current, colorScaleMode: event.target.value as DraftState["colorScaleMode"] }))}><option value="shared">Shared colors</option><option value="per-location">Separate colors by location</option></select></label><label className="field"><span>Preferred yarn brand</span><select className="input" value={draft.preferredYarnBrandId ?? ""} onChange={(event) => setDraft((current) => ({ ...current, preferredYarnBrandId: event.target.value || null }))}><option value="">None</option>{yarnCatalogService.getBrands().map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label><label className="field"><span>Recommendation mode</span><select className="input" value={draft.recommendationMode} onChange={(event) => setDraft((current) => ({ ...current, recommendationMode: event.target.value as DraftState["recommendationMode"] }))}><option value="exact-nearest">Nearest match</option><option value="brand-palette-only">Brand palette</option><option value="manual-only">Manual only</option></select></label><label className="field"><span>Bands per scale</span><select className="input" value={draft.bandCount} onChange={(event) => setDraft((current) => ({ ...current, bandCount: Number(event.target.value) }))}><option value={8}>8 bands</option><option value={10}>10 bands</option><option value={12}>12 bands</option></select></label></div><div className="legendBar">{reviewRanges.slice(0, draft.bandCount).map((range) => <div key={range.id} style={{ backgroundColor: range.hexColor }} title={range.label}/>)}</div><p className="mutedText">{draft.colorScaleMode === "shared" ? "One temperature scale is used everywhere." : `Each of the ${draft.locations.length} locations gets its own editable scale.`}</p></div> : null}
    {step === 5 ? <div className="stackMd"><h2 className="sectionTitle">Review + create</h2><div className="reviewGrid"><div><strong>Date range</strong><p>{draft.startDate} to {draft.endDate}</p></div><div><strong>Temperature</strong><p>{draft.tempMode} · {draft.unit}</p></div><div><strong>Stitch</strong><p>{draft.stitchName} · {draft.stitchesPerRow} stitches</p></div><div><strong>Colors</strong><p>{draft.colorScaleMode === "shared" ? "Shared scale" : "Separate by location"}</p></div></div><section className="timelineReview"><h3 className="sectionTitle">{draft.locations.length} location{draft.locations.length === 1 ? "" : "s"}</h3>{draft.locations.map((location, index) => <div className="timelineReviewRow" key={location.id}><span>{index + 1}</span><strong>{location.location.name}</strong><small>{location.startDate} to {location.endDate}</small></div>)}</section>
      {weatherError ? <div className="banner warning"><div>{weatherError}<div className="inlineActions"><button className="secondaryButton" onClick={() => void handleCreate("none")} type="button">Retry failed</button><button className="secondaryButton" onClick={() => void handleCreate("allowMock")} type="button">Use mock for failed locations</button><button className="ghostButton" onClick={() => setWeatherError(null)} type="button">Cancel</button></div></div></div> : null}
      {confirmRegeneration ? <div className="banner warning"><div><strong>Weather timeline changed.</strong><p>Daily rows will be rebuilt. Completed dates that still exist remain complete.</p><div className="inlineActions"><button className="dangerButton" onClick={() => void handleCreate()} type="button">Rebuild and save</button><button className="ghostButton" onClick={() => setConfirmRegeneration(false)} type="button">Cancel</button></div></div></div> : null}
      <button className="primaryButton" disabled={creating} onClick={() => void handleCreate()} type="button">{creating ? "Saving..." : existingProject ? "Save project" : "Create project"}</button></div> : null}
    <div className="wizardActions"><button className="ghostButton" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))} type="button">Back</button><button className="secondaryButton" disabled={!canContinue || step === steps.length - 1} onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))} type="button">Next</button><button className="ghostButton" onClick={() => { window.sessionStorage.removeItem(draftKey); router.push(existingProject ? `/app/projects/${existingProject.id}/settings` : "/app/projects"); }} type="button">Cancel setup</button></div>
  </section></div>;
}
