"use client";

import Link from "next/link";
import {
  formatTemperature,
  getColorUsage,
  getNextRows,
  getProjectCompletion,
  getProjectDays,
  getProjectRanges,
} from "@temperature-blanket/core";

import { useAppData } from "@/providers/AppDataProvider";

export function ProjectColorView({ projectId }: { projectId: string }) {
  const { data, saveRanges } = useAppData();
  const project = data.projects.find((item) => item.id === projectId);
  const ranges = getProjectRanges(projectId, data.ranges);

  if (!project) {
    return <div className="card">Project not found.</div>;
  }

  return (
    <div className="stackLg">
      <section className="card stackMd">
        <h2 className="sectionTitle">Color mapping</h2>
        <p className="mutedText">
          This web view keeps the current mapping editable without bringing over the
          native modal-only editing model.
        </p>
        <div className="stackSm">
          {ranges.map((range, index) => (
            <div className="rangeRow" key={range.id}>
              <input className="input colorInput" defaultValue={range.hexColor} type="color" />
              <span>{range.label}</span>
              <span className="mutedText">
                {range.minTemp} to {range.maxTemp}
              </span>
            </div>
          ))}
        </div>
        <button className="secondaryButton" onClick={() => void saveRanges(projectId, ranges, project.allowRangeGaps)} type="button">
          Save current mapping
        </button>
      </section>
    </div>
  );
}

export function ProjectPreviewView({ projectId }: { projectId: string }) {
  const { data } = useAppData();
  const project = data.projects.find((item) => item.id === projectId);
  const days = getProjectDays(projectId, data.temperatureDays);
  const usage = getColorUsage(days);

  if (!project) {
    return <div className="card">Project not found.</div>;
  }

  return (
    <div className="stackLg">
      <section className="card stackMd">
        <h2 className="sectionTitle">Blanket preview</h2>
        <div className="blanketPreview">
          {days.map((day) => (
            <div className="previewRow" key={day.id}>
              <span className="previewSwatch" style={{ backgroundColor: day.mappedColor ?? "#cbd5e1" }} />
              <span>{day.date}</span>
              <span className="mutedText">{formatTemperature(day.selectedTemp, project.unit)}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="card stackMd">
        <h3 className="sectionTitle">Color usage</h3>
        {Object.entries(usage).map(([color, count]) => (
          <div className="usageRow" key={color}>
            <span className="swatch" style={{ backgroundColor: color === "unmapped" ? "#fbbf24" : color }} />
            <span>{color}</span>
            <strong>{count}</strong>
          </div>
        ))}
      </section>
    </div>
  );
}

export function ProjectBuildView({ projectId }: { projectId: string }) {
  const { data, toggleRowCompleted } = useAppData();
  const project = data.projects.find((item) => item.id === projectId);
  const nextRows = getNextRows(projectId, data.progressRows, data.temperatureDays, 5);
  const completion = getProjectCompletion(projectId, data.progressRows);

  if (!project) {
    return <div className="card">Project not found.</div>;
  }

  return (
    <div className="stackLg">
      <section className="card stackMd">
        <h2 className="sectionTitle">Build mode</h2>
        <p className="mutedText">
          {completion.completed} of {completion.total} rows complete ({completion.percent}%)
        </p>
        <div className="stackSm">
          {nextRows.map((row) => (
            <label className="buildRow" key={row.progressRow.id}>
              <input
                checked={row.progressRow.completed}
                onChange={(event) =>
                  void toggleRowCompleted(projectId, row.progressRow.id, event.target.checked)
                }
                type="checkbox"
              />
              <span className="swatch" style={{ backgroundColor: row.day?.mappedColor ?? "#cbd5e1" }} />
              <span>Row {row.progressRow.rowNumber}</span>
              <span>{row.progressRow.date}</span>
              <span className="mutedText">
                {formatTemperature(row.day?.selectedTemp ?? null, project.unit)}
              </span>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}

export function ProjectSettingsView({ projectId }: { projectId: string }) {
  const {
    archiveProject,
    data,
    deleteProject,
    duplicateProject,
    exportProjectJson,
    resetProjectProgress,
    restoreProject,
  } = useAppData();
  const project = data.projects.find((item) => item.id === projectId);

  if (!project) {
    return <div className="card">Project not found.</div>;
  }

  return (
    <div className="stackLg">
      <section className="card stackMd">
        <h2 className="sectionTitle">Project settings</h2>
        <p className="mutedText">{project.locationName}</p>
        <p className="mutedText">
          {project.startDate} to {project.endDate}
        </p>
        <div className="inlineActions">
          <button
            className="secondaryButton"
            onClick={() => {
              const payload = exportProjectJson(projectId);
              const blob = new Blob([payload], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `${project.name.replace(/\s+/g, "-").toLowerCase()}.json`;
              link.click();
              URL.revokeObjectURL(url);
            }}
            type="button"
          >
            Download export
          </button>
          <button className="secondaryButton" onClick={() => void duplicateProject(projectId)} type="button">
            Duplicate
          </button>
          <button className="secondaryButton" onClick={() => void resetProjectProgress(projectId)} type="button">
            Reset progress
          </button>
          <button
            className="secondaryButton"
            onClick={() =>
              void (project.archivedAt ? restoreProject(projectId) : archiveProject(projectId))
            }
            type="button"
          >
            {project.archivedAt ? "Restore" : "Archive"}
          </button>
          <button className="dangerButton" onClick={() => void deleteProject(projectId)} type="button">
            Delete
          </button>
        </div>
      </section>
      <section className="card stackMd">
        <h3 className="sectionTitle">Support the Developer</h3>
        <p className="mutedText">
          Google Play donations stay on mobile. Web support checkout will be added in a later pass.
        </p>
      </section>
      <Link className="ghostButton inlineLink" href={`/app/projects/${projectId}/preview`}>
        Back to preview
      </Link>
    </div>
  );
}
