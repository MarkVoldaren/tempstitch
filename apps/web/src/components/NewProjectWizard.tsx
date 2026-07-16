"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { applyYarnRecommendationsToRanges, autoGenerateRanges, getProjectRanges, getTemperatureSpan, hasProjectWeatherSettingsChanged, yarnCatalogService, type FetchWeatherResult, type LocationSuggestion, type ProjectDraftInput, type TemperatureRangeColor } from "@temperature-blanket/core";

import { useAppData } from "@/providers/AppDataProvider";

const steps = [
  "Project basics",
  "Location",
  "Date range + temperature",
  "Stitch settings",
  "Color ranges",
  "Review + create",
] as const;

type DraftState = Omit<ProjectDraftInput, "location"> & {
  location: ProjectDraftInput["location"] | null;
  bandCount: number;
};

export function NewProjectWizard({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const { data, saveProject, searchLocations, previewWeather } = useAppData();
  const existingProject = data.projects.find((project) => project.id === projectId);
  const existingRanges = projectId ? getProjectRanges(projectId, data.ranges) : [];
  const [step, setStep] = useState(0);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<LocationSuggestion[]>([]);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherPreview, setWeatherPreview] = useState<FetchWeatherResult | null>(null);
  const [rangeMode, setRangeMode] = useState<"fullYear" | "custom">("fullYear");
  const [confirmRegeneration, setConfirmRegeneration] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<DraftState>({
    id: existingProject?.id,
    name: existingProject?.name ?? "",
    location: existingProject ? { query: existingProject.locationName, name: existingProject.locationName, latitude: existingProject.latitude, longitude: existingProject.longitude } : null,
    unit: existingProject?.unit ?? "fahrenheit", tempMode: existingProject?.tempMode ?? "avg",
    startDate: existingProject?.startDate ?? `${new Date().getFullYear() - 1}-01-01`, endDate: existingProject?.endDate ?? `${new Date().getFullYear() - 1}-12-31`,
    stitchesPerRow: existingProject?.stitchesPerRow ?? 180, rowHeight: existingProject?.rowHeight ?? 12,
    craftType: existingProject?.craftType ?? "crochet", stitchName: existingProject?.stitchName ?? "Single crochet",
    previewOrientation: existingProject?.previewOrientation ?? "horizontal", notes: existingProject?.notes ?? "",
    allowRangeGaps: existingProject?.allowRangeGaps ?? false, preferredYarnBrandId: existingProject?.preferredYarnBrandId ?? null,
    recommendationMode: existingProject?.recommendationMode ?? "exact-nearest", ranges: existingRanges,
    bandCount: existingRanges.length || 8,
  });

  const draftKey = `tempstitch:setup-draft:${projectId ?? "new"}`;
  useEffect(() => { const raw = window.sessionStorage.getItem(draftKey); if (raw) { try { setDraft(JSON.parse(raw) as DraftState); } catch { window.sessionStorage.removeItem(draftKey); } } }, [draftKey]);
  useEffect(() => {
    if (!existingProject || draft.id === existingProject.id) return;
    setDraft({
      id: existingProject.id, name: existingProject.name,
      location: { query: existingProject.locationName, name: existingProject.locationName, latitude: existingProject.latitude, longitude: existingProject.longitude },
      unit: existingProject.unit, tempMode: existingProject.tempMode, startDate: existingProject.startDate, endDate: existingProject.endDate,
      stitchesPerRow: existingProject.stitchesPerRow, rowHeight: existingProject.rowHeight, craftType: existingProject.craftType,
      stitchName: existingProject.stitchName, previewOrientation: existingProject.previewOrientation, notes: existingProject.notes ?? "",
      allowRangeGaps: existingProject.allowRangeGaps, preferredYarnBrandId: existingProject.preferredYarnBrandId ?? null,
      recommendationMode: existingProject.recommendationMode, ranges: existingRanges, bandCount: existingRanges.length || 8,
    });
    setLocationQuery(existingProject.locationName);
  }, [draft.id, existingProject, existingRanges]);
  useEffect(() => { window.sessionStorage.setItem(draftKey, JSON.stringify(draft)); }, [draft, draftKey]);

  const reviewRanges = useMemo<TemperatureRangeColor[]>(() => {
    if (!draft.location) {
      return [];
    }

    const generated = autoGenerateRanges(
      "preview-project",
      weatherPreview ? getTemperatureSpan(weatherPreview.daily) ?? { min: 0, max: 100 } : { min: 0, max: 100 },
      draft.bandCount,
    );
    return applyYarnRecommendationsToRanges(generated, { brandId: draft.preferredYarnBrandId, recommendationMode: draft.recommendationMode, preserveLocked: false });
  }, [draft.bandCount, draft.location, draft.preferredYarnBrandId, draft.recommendationMode, weatherPreview]);

  async function handleSearchLocations() {
    const results = await searchLocations(locationQuery);
    setLocationResults(results);
  }

  async function handleCreate() {
    if (!draft.location) {
      return;
    }

    if (existingProject && hasProjectWeatherSettingsChanged(existingProject, { locationName: draft.location.name, latitude: draft.location.latitude, longitude: draft.location.longitude, startDate: draft.startDate, endDate: draft.endDate, tempMode: draft.tempMode }) && !confirmRegeneration) { setConfirmRegeneration(true); return; }
    setCreating(true);
    setWeatherError(null);

    const baseInput: ProjectDraftInput = {
      ...draft,
      location: draft.location,
      ranges: reviewRanges.map((range, index) => ({
        ...range,
        projectId: "pending",
        sortOrder: index,
      })),
    };

    try {
      const result = await saveProject(baseInput, { fallbackMode: "none" });
      window.sessionStorage.removeItem(draftKey);
      router.push(`/app/projects/${result.projectId}/preview`);
    } catch (error) {
      setWeatherError(error instanceof Error ? error.message : "Unable to create project.");
    } finally {
      setCreating(false);
    }
  }

  async function handleContinueWithMock() {
    if (!draft.location) {
      return;
    }

    setCreating(true);
    const baseInput: ProjectDraftInput = {
      ...draft,
      location: draft.location,
      ranges: reviewRanges.map((range, index) => ({
        ...range,
        projectId: "pending",
        sortOrder: index,
      })),
    };

    try {
      const result = await saveProject(baseInput, { fallbackMode: "mockOnly" });
      window.sessionStorage.removeItem(draftKey);
      router.push(`/app/projects/${result.projectId}/preview`);
    } finally {
      setCreating(false);
    }
  }

  const canContinue = [
    draft.name.trim().length > 0,
    Boolean(draft.location),
    draft.startDate <= draft.endDate,
    draft.stitchName.trim().length > 0 && draft.stitchesPerRow > 0,
    draft.bandCount > 0,
    Boolean(draft.location),
  ][step];

  return (
    <div className="stackLg">
      <section className="card stackMd">
        <div className="stepRow">
          {steps.map((label, index) => (
            <div className={index === step ? "stepChip active" : "stepChip"} key={label}>
              {index + 1}. {label}
            </div>
          ))}
        </div>

        {step === 0 ? (
          <div className="stackMd">
            <h2 className="sectionTitle">{existingProject ? "Edit project basics" : "Project basics"}</h2>
            <label className="field">
              <span>Project name</span>
              <input
                className="input"
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="2025 Family Blanket"
                value={draft.name}
              />
            </label>
            <label className="field">
              <span>Notes</span>
              <textarea
                className="input textarea"
                onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                value={draft.notes ?? ""}
              />
            </label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="stackMd">
            <h2 className="sectionTitle">Location</h2>
            <div className="inlineField">
              <input
                className="input"
                onChange={(event) => setLocationQuery(event.target.value)}
                placeholder="Chicago, Illinois"
                value={locationQuery}
              />
              <button className="secondaryButton" onClick={() => void handleSearchLocations()} type="button">
                Search
              </button>
            </div>
            <div className="stackSm">
              {locationResults.map((result) => (
                <button
                  className={
                    draft.location?.name === result.name &&
                    draft.location?.latitude === result.latitude &&
                    draft.location?.longitude === result.longitude
                      ? "locationResult active"
                      : "locationResult"
                  }
                  key={result.id}
                  onClick={() => setDraft((current) => ({
                    ...current,
                    location: {
                      query: locationQuery,
                      name: result.name,
                      latitude: result.latitude,
                      longitude: result.longitude,
                    },
                  }))}
                  type="button"
                >
                  <strong>{result.name}</strong>
                  <span>
                    {result.latitude.toFixed(3)}, {result.longitude.toFixed(3)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="stackMd">
            <h2 className="sectionTitle">Date range + temperature mode</h2>
            <div className="segmented"><button className={rangeMode === "fullYear" ? "segment active" : "segment"} onClick={() => { setRangeMode("fullYear"); const year = draft.startDate.slice(0, 4); setDraft((current) => ({ ...current, startDate: `${year}-01-01`, endDate: `${year}-12-31` })); }} type="button">Full year</button><button className={rangeMode === "custom" ? "segment active" : "segment"} onClick={() => setRangeMode("custom")} type="button">Custom dates</button></div>
            <div className="grid2">
              <label className="field">
                <span>Start date</span>
                <input
                  className="input"
                  onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))}
                  type="date"
                  value={draft.startDate}
                />
              </label>
              <label className="field">
                <span>End date</span>
                <input
                  className="input"
                  onChange={(event) => setDraft((current) => ({ ...current, endDate: event.target.value }))}
                  type="date"
                  value={draft.endDate}
                />
              </label>
            </div>
            <label className="field">
              <span>Temperature mode</span>
              <select
                className="input"
                onChange={(event) => setDraft((current) => ({ ...current, tempMode: event.target.value as DraftState["tempMode"] }))}
                value={draft.tempMode}
              >
                <option value="avg">Average</option>
                <option value="high">Daily high</option>
                <option value="low">Daily low</option>
              </select>
            </label>
            <label className="field"><span>Unit</span><select className="input" value={draft.unit} onChange={(event) => setDraft((current) => ({ ...current, unit: event.target.value as DraftState["unit"] }))}><option value="fahrenheit">Fahrenheit</option><option value="celsius">Celsius</option></select></label>
            <button
              className="secondaryButton"
              onClick={() => {
                if (!draft.location) {
                  return;
                }
                void previewWeather({
                  ...draft,
                  location: draft.location,
                  ranges: [],
                } as ProjectDraftInput).then(setWeatherPreview).catch((error) => setWeatherError(error instanceof Error ? error.message : "Weather preview failed."));
              }}
              type="button"
            >
              Preview weather connection
            </button>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="stackMd">
            <h2 className="sectionTitle">Stitch settings</h2>
            <div className="grid2">
              <label className="field">
                <span>Craft type</span>
                <select
                  className="input"
                  onChange={(event) => setDraft((current) => ({ ...current, craftType: event.target.value as DraftState["craftType"] }))}
                  value={draft.craftType}
                >
                  <option value="crochet">Crochet</option>
                  <option value="knit">Knit</option>
                </select>
              </label>
              <label className="field"><span>Preview orientation</span><select className="input" value={draft.previewOrientation} onChange={(event) => setDraft((current) => ({ ...current, previewOrientation: event.target.value as DraftState["previewOrientation"] }))}><option value="horizontal">Horizontal rows</option><option value="vertical">Vertical strips</option></select></label>
              <label className="field"><span>Stitch preset</span><select className="input" value={draft.stitchName} onChange={(event) => setDraft((current) => ({ ...current, stitchName: event.target.value }))}><option>Single crochet</option><option>Double crochet</option><option>Garter</option><option>Stockinette</option></select></label>
              <label className="field">
                <span>Stitch name</span>
                <input
                  className="input"
                  onChange={(event) => setDraft((current) => ({ ...current, stitchName: event.target.value }))}
                  value={draft.stitchName}
                />
              </label>
              <label className="field">
                <span>Stitches per row</span>
                <input
                  className="input"
                  min={1}
                  onChange={(event) => setDraft((current) => ({ ...current, stitchesPerRow: Number(event.target.value) }))}
                  type="number"
                  value={draft.stitchesPerRow}
                />
              </label>
              <label className="field">
                <span>Row height</span>
                <input
                  className="input"
                  min={1}
                  onChange={(event) => setDraft((current) => ({ ...current, rowHeight: Number(event.target.value) }))}
                  type="number"
                  value={draft.rowHeight}
                />
              </label>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="stackMd">
            <h2 className="sectionTitle">Color ranges</h2>
            <div className="grid2"><label className="field"><span>Preferred yarn brand</span><select className="input" value={draft.preferredYarnBrandId ?? ""} onChange={(event) => setDraft((current) => ({ ...current, preferredYarnBrandId: event.target.value || null }))}><option value="">None</option>{yarnCatalogService.getBrands().map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label><label className="field"><span>Recommendation mode</span><select className="input" value={draft.recommendationMode} onChange={(event) => setDraft((current) => ({ ...current, recommendationMode: event.target.value as DraftState["recommendationMode"] }))}><option value="exact-nearest">Nearest match</option><option value="brand-palette-only">Brand palette</option><option value="manual-only">Manual only</option></select></label></div>
            <label className="field">
              <span>Auto-generated bands</span>
              <select
                className="input"
                onChange={(event) => setDraft((current) => ({ ...current, bandCount: Number(event.target.value) }))}
                value={draft.bandCount}
              >
                <option value={8}>8 bands</option>
                <option value={10}>10 bands</option>
                <option value={12}>12 bands</option>
              </select>
            </label>
            <div className="legendPreview">
              {reviewRanges.map((range) => (
                <div className="legendItem" key={range.id}>
                  <span className="swatch" style={{ backgroundColor: range.hexColor }} />
                  <span>{range.label}</span>
                </div>
              ))}
            </div>
            {weatherPreview ? <div className="banner info">{weatherPreview.providerLabel}: {weatherPreview.daily.length} days loaded. Bands use the actual temperature span.</div> : <div className="banner warning">Preview weather in the previous step to generate bands from the actual temperature span.</div>}
          </div>
        ) : null}

        {step === 5 ? (
          <div className="stackMd">
            <h2 className="sectionTitle">Review + create</h2>
            <div className="reviewGrid">
              <div><strong>Location</strong><p>{draft.location?.name ?? "Not selected"}</p></div>
              <div><strong>Date range</strong><p>{draft.startDate} to {draft.endDate}</p></div>
              <div><strong>Temp mode</strong><p>{draft.tempMode}</p></div>
              <div><strong>Stitch</strong><p>{draft.stitchName}</p></div>
              <div><strong>Stitches per row</strong><p>{draft.stitchesPerRow}</p></div>
              <div><strong>Color bands</strong><p>{draft.bandCount}</p></div>
            </div>
            {weatherError ? (
              <div className="banner warning">
                {weatherError}
                <div className="inlineActions">
                  <button className="secondaryButton" onClick={() => void handleCreate()} type="button">
                    Retry
                  </button>
                  <button className="secondaryButton" onClick={() => void handleContinueWithMock()} type="button">
                    Continue with mock
                  </button>
                  <button className="ghostButton" onClick={() => setWeatherError(null)} type="button">
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
            {confirmRegeneration ? <div className="banner warning"><strong>Weather settings changed.</strong><p>Saving will rebuild daily rows. Completed dates that still exist will remain complete.</p><div className="inlineActions"><button className="dangerButton" onClick={() => void handleCreate()} type="button">Rebuild and save</button><button className="ghostButton" onClick={() => setConfirmRegeneration(false)} type="button">Cancel</button></div></div> : null}
            <button className="primaryButton" disabled={creating} onClick={() => void handleCreate()} type="button">
              {creating ? "Saving..." : existingProject ? "Save project" : "Create project"}
            </button>
          </div>
        ) : null}

        <div className="wizardActions">
          <button
            className="ghostButton"
            disabled={step === 0}
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            type="button"
          >
            Back
          </button>
          <button
            className="secondaryButton"
            disabled={!canContinue || step === steps.length - 1}
            onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}
            type="button"
          >
            Next
          </button>
          <button className="ghostButton" onClick={() => { window.sessionStorage.removeItem(draftKey); router.push(existingProject ? `/app/projects/${existingProject.id}/settings` : "/app/projects"); }} type="button">Cancel setup</button>
        </div>
      </section>
    </div>
  );
}
