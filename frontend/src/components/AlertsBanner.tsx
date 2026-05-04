import { useState, useEffect } from "react";
import type { EnvironmentalReport } from "../types";
import { countReportsByZone, ALERT_THRESHOLD } from "../lib/zones";

interface Props {
  reports: EnvironmentalReport[];
}

export default function AlertsBanner({ reports }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [visible, setVisible] = useState<Set<string>>(new Set());

  const zoneCounts = countReportsByZone(reports);
  const alertZones = zoneCounts.filter((zc) => zc.count >= ALERT_THRESHOLD);

  // Animate in new alerts
  useEffect(() => {
    const newAlerts = alertZones
      .map((zc) => zc.zone.id)
      .filter((id) => !dismissed.has(id));
    if (newAlerts.length === 0) return;
    const timeout = setTimeout(() => {
      setVisible(new Set(newAlerts));
    }, 80);
    return () => clearTimeout(timeout);
  }, [reports]); // eslint-disable-line react-hooks/exhaustive-deps

  function dismiss(zoneId: string) {
    setDismissed((prev) => new Set([...prev, zoneId]));
    setVisible((prev) => {
      const next = new Set(prev);
      next.delete(zoneId);
      return next;
    });
  }

  const activeAlerts = alertZones.filter((zc) => !dismissed.has(zc.zone.id));

  if (activeAlerts.length === 0) return null;

  return (
    <div className="alerts-container" role="alert" aria-live="polite">
      <div className="alerts-header">
        <span className="alerts-icon">⚠</span>
        <span className="alerts-title">Zone Concentration Alerts</span>
        <span className="alerts-subtitle">
          {activeAlerts.length} zone{activeAlerts.length !== 1 ? "s" : ""} with high report density
        </span>
      </div>

      <div className="alerts-list">
        {activeAlerts.map(({ zone, count, reports: zoneReports }) => {
          const typeBreakdown = zoneReports.reduce<Record<string, number>>((acc, r) => {
            acc[r.problemType] = (acc[r.problemType] ?? 0) + 1;
            return acc;
          }, {});
          const topType = Object.entries(typeBreakdown).sort((a, b) => b[1] - a[1])[0];

          return (
            <div
              key={zone.id}
              className={`alert-card alert-card--${zone.id} ${visible.has(zone.id) ? "alert-card--visible" : ""}`}
              style={{ "--zone-color": zone.color } as React.CSSProperties}
            >
              <div className="alert-card__stripe" style={{ background: zone.color }} />

              <div className="alert-card__body">
                <div className="alert-card__top">
                  <span className="alert-card__zone-badge" style={{ color: zone.color, borderColor: zone.color }}>
                    {zone.label}
                  </span>
                  <span className="alert-card__desc">{zone.description}</span>
                  <button
                    className="alert-card__dismiss"
                    onClick={() => dismiss(zone.id)}
                    aria-label={`Dismiss alert for ${zone.label}`}
                  >
                    ✕
                  </button>
                </div>

                <p className="alert-card__message">
                  <strong style={{ color: zone.color }}>{count} reports</strong> concentrated in this zone
                  {topType && (
                    <>
                      {" "}— most common issue:{" "}
                      <span className="alert-card__type">
                        {topType[0].replace(/_/g, " ").toLowerCase()} ({topType[1]})
                      </span>
                    </>
                  )}
                </p>

                <div className="alert-card__breakdown">
                  {Object.entries(typeBreakdown).map(([type, cnt]) => (
                    <span key={type} className="alert-card__pill">
                      {type.replace(/_/g, " ")} · {cnt}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}