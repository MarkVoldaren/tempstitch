"use client";

import { type ReactNode, useEffect } from "react";

export function SegmentedControl<T extends string>({ label, onChange, options, value }: { label?: string; onChange: (value: T) => void; options: Array<{ label: string; value: T }>; value: T }) {
  return <div className="field">{label ? <span>{label}</span> : null}<div className="segmented" role="group" aria-label={label}>{options.map((option) => <button aria-pressed={value === option.value} className={value === option.value ? "segment active" : "segment"} key={option.value} onClick={() => onChange(option.value)} type="button">{option.label}</button>)}</div></div>;
}

export function ProgressHeader({ completed, percent, total }: { completed: number; percent: number; total: number }) {
  return <div className="progressCard"><div><strong>{percent}% complete</strong><span>{completed} of {total} rows</span></div><div aria-label={`${percent}% complete`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={percent} className="progressTrack" role="progressbar"><span style={{ width: `${percent}%` }} /></div></div>;
}

export function Banner({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" | "danger" | "success" }) { const marks = { info: "i", warning: "!", danger: "!", success: "OK" }; return <div className={`banner ${tone}`}><span className="bannerMark" aria-hidden="true">{marks[tone]}</span><div>{children}</div></div>; }

export function ConfirmDialog({ confirmLabel, danger, message, onCancel, onConfirm, open, title }: { confirmLabel: string; danger?: boolean; message: string; onCancel: () => void; onConfirm: () => void | Promise<void>; open: boolean; title: string }) {
  if (!open) return null;
  return <div className="dialogBackdrop" role="presentation" onMouseDown={onCancel}><div aria-modal="true" className="dialogCard" onMouseDown={(event) => event.stopPropagation()} role="dialog"><h2 className="sectionTitle">{title}</h2><p className="mutedText">{message}</p><div className="inlineActions end"><button className="ghostButton" onClick={onCancel} type="button">Cancel</button><button className={danger ? "dangerButton" : "primaryButton"} onClick={() => void onConfirm()} type="button">{confirmLabel}</button></div></div></div>;
}

export function Toast({ action, message, onDismiss }: { action?: { label: string; run: () => void }; message: string | null; onDismiss: () => void }) {
  useEffect(() => { if (!message) return; const timer = window.setTimeout(onDismiss, 4500); return () => window.clearTimeout(timer); }, [message, onDismiss]);
  return message ? <div className="toast" role="status"><span>{message}</span>{action ? <button onClick={action.run} type="button">{action.label}</button> : null}<button onClick={onDismiss} type="button">Dismiss</button></div> : null;
}

export function YarnSwatch({ color, label, targetColor }: { color?: string | null; label?: string; targetColor: string }) {
  return <span className="yarnSwatchGroup" title={label}><span className="swatch target" style={{ backgroundColor: targetColor }} />{color ? <span className="swatch yarn" style={{ backgroundColor: color }} /> : null}</span>;
}
