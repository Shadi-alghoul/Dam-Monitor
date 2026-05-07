import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { EnvironmentalReport, ProblemType } from "../types";
import HeatmapLayer from "./HeatmapLayer";
import ZoneOverlayLayer from "./ZoneOverlayLayer";
import { countReportsByZone, ALERT_THRESHOLD } from "../lib/zones";

// ── Constants ──────────────────────────────────────────────────────────────
const DAM_CENTER: [number, number] = [-25.748, 27.848];
const DAM_ZOOM = 13;
const DAM_MIN_ZOOM = 13;

const DAM_BOUNDS: L.LatLngBoundsExpression = [
  [-25.778, 27.784],
  [-25.720, 27.912],
];

const PROBLEM_COLORS: Record<ProblemType, string> = {
  POLLUTION: "#ef4444",
  ALGAE_BLOOM: "#22c55e",
  WILDLIFE_DISTRESS: "#f97316",
  ILLEGAL_DUMPING: "#a855f7",
  INFRASTRUCTURE_DAMAGE: "#eab308",
  OTHER: "#3b82f6",
};

const PROBLEM_LABELS: Record<ProblemType, string> = {
  POLLUTION: "Pollution",
  ALGAE_BLOOM: "Algae Bloom",
  WILDLIFE_DISTRESS: "Wildlife Distress",
  ILLEGAL_DUMPING: "Illegal Dumping",
  INFRASTRUCTURE_DAMAGE: "Infrastructure Damage",
  OTHER: "Other",
};

// ── Helpers ────────────────────────────────────────────────────────────────
function createPinIcon(type: ProblemType): L.DivIcon {
  const color = PROBLEM_COLORS[type];
  const svg = `
    <svg viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg" width="28" height="42">
      <path
        d="M12 0C5.373 0 0 5.373 0 12c0 8.284 10.667 22.628 11.134 23.243a1.1 1.1 0 0 0 1.732 0
           C13.333 34.628 24 20.284 24 12 24 5.373 18.627 0 12 0z"
        fill="${color}"
        filter="drop-shadow(0 3px 5px rgba(0,0,0,0.55))"
      />
      <circle cx="12" cy="12" r="5" fill="white" />
    </svg>`;

  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [28, 42],
    iconAnchor: [14, 42],
    popupAnchor: [0, -46],
  });
}

// ── Sub-component: re-centres the map when reports change ─────────────────
function MapAutoFit({ reports }: { reports: EnvironmentalReport[] }) {
  const map = useMap();
  const hasReports = reports.some((r) => r.latitude != null && r.longitude != null);

  useEffect(() => {
    if (!hasReports) return;
    const points = reports
      .filter((r) => r.latitude != null && r.longitude != null)
      .map((r) => [r.latitude!, r.longitude!] as [number, number]);

    if (points.length === 1) {
      map.setView(points[0], DAM_ZOOM);
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
    }
  }, [reports, map, hasReports]);

  return null;
}

// ── Main component ─────────────────────────────────────────────────────────
interface Props {
  reports: EnvironmentalReport[];
}

export default function ReportsMapSection({ reports }: Props) {
  const [filterType, setFilterType] = useState<ProblemType | "">("");
  const [showZones, setShowZones] = useState(true);

  // Zone counts (always based on all reports, not just filtered)
  const zoneCounts = useMemo(() => countReportsByZone(reports), [reports]);

  // Filter reports for the map (only those with coordinates)
  const filteredReports = useMemo(() => {
    const geoReports = reports.filter((r) => r.latitude != null && r.longitude != null);
    if (!filterType) return geoReports;
    return geoReports.filter((r) => r.problemType === filterType);
  }, [reports, filterType]);

  // Pre-build icons outside JSX
  const iconCache = useRef<Partial<Record<ProblemType, L.DivIcon>>>({});
  function getIcon(type: ProblemType): L.DivIcon {
    if (!iconCache.current[type]) {
      iconCache.current[type] = createPinIcon(type);
    }
    return iconCache.current[type]!;
  }

  return (
    <section className="panel">
      <div className="section-header">
        <h2 className="section-title">Report locations</h2>

        <div className="filter-group">
          <label htmlFor="map-filter" className="filter-label">
            Filter by type:
          </label>
          <div className="custom-select">
            <select
              id="map-filter"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as ProblemType | "")}
            >
              <option value="">All Types</option>
              {Object.entries(PROBLEM_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Zone toggle */}
          <button
            className={`zone-toggle-btn ${showZones ? "zone-toggle-btn--active" : ""}`}
            onClick={() => setShowZones((v) => !v)}
            title="Toggle zone overlays"
          >
            {showZones ? "Hide Zones" : "Show Zones"}
          </button>
        </div>
      </div>

      <p className="satellite-meta">
        {filteredReports.length === 0
          ? "No reports with location data match the current filter."
          : `Showing ${filteredReports.length} pinned report${filteredReports.length !== 1 ? "s" : ""} on the map.`}
      </p>

      {/* Zone summary strip */}
      {showZones && (
        <div className="zone-summary-strip">
          {zoneCounts.map(({ zone, count }) => {
            const isAlert = count >= ALERT_THRESHOLD;
            return (
              <div
                key={zone.id}
                className={`zone-chip ${isAlert ? "zone-chip--alert" : ""}`}
                style={{ "--zc": zone.color } as React.CSSProperties}
              >
                <span className="zone-chip__dot" style={{ background: zone.color }} />
                <span className="zone-chip__label">{zone.label}</span>
                <span className="zone-chip__count" style={{ color: zone.color }}>
                  {count}
                </span>
                {isAlert && <span className="zone-chip__warn">⚠</span>}
              </div>
            );
          })}
        </div>
      )}

      <div className="report-map-wrapper">
        <MapContainer
          center={DAM_CENTER}
          zoom={DAM_ZOOM}
          className="report-map"
          scrollWheelZoom
          maxBounds={DAM_BOUNDS}
          maxBoundsViscosity={1.0}
          minZoom={DAM_MIN_ZOOM}
          maxZoom={18}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapAutoFit reports={filteredReports} />
          <HeatmapLayer reports={filteredReports} />

          {showZones && (
            <ZoneOverlayLayer zoneCounts={zoneCounts} threshold={ALERT_THRESHOLD} />
          )}

          {filteredReports.map((report) => (
            <Marker
              key={report.id}
              position={[report.latitude!, report.longitude!]}
              icon={getIcon(report.problemType)}
            >
              <Popup className="report-popup" minWidth={200} maxWidth={240}>
                <div className="report-popup__content">
                  <img
                    src={report.imageUrl}
                    alt={report.problemType}
                    className="report-popup__img"
                    loading="lazy"
                  />
                  <p
                    className="report-popup__type"
                    style={{ color: PROBLEM_COLORS[report.problemType] }}
                  >
                    {PROBLEM_LABELS[report.problemType]}
                  </p>
                  <p className="report-popup__desc">{report.description}</p>
                  <p className="report-popup__coords">
                    📍 {report.latitude!.toFixed(5)}, {report.longitude!.toFixed(5)}
                  </p>
                  <p className="report-popup__meta">
                    {new Date(report.createdAt).toLocaleString()}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Colour legend */}
      <div className="map-legend">
        {(Object.entries(PROBLEM_COLORS) as [ProblemType, string][]).map(([type, color]) => (
          <span key={type} className="map-legend__item">
            <span className="map-legend__dot" style={{ background: color }} />
            {PROBLEM_LABELS[type]}
          </span>
        ))}
      </div>
    </section>
  );
}