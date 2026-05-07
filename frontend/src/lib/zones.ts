import type { EnvironmentalReport } from "../types";

// Hartbeespoort Dam full bounds
export const DAM_BOUNDS = {
  minLon: 27.78822,
  maxLon: 27.907053,
  minLat: -25.77346,
  maxLat: -25.723519,
};

// Split longitude into 3 equal vertical strips
const lonSpan = DAM_BOUNDS.maxLon - DAM_BOUNDS.minLon; // ~0.1188 degrees
const lonThird = lonSpan / 3;

export const ZONES = [
  {
    id: "zone1",
    label: "Zone 1",
    description: "Western sector",
    minLon: DAM_BOUNDS.minLon,
    maxLon: DAM_BOUNDS.minLon + lonThird,
    minLat: DAM_BOUNDS.minLat,
    maxLat: DAM_BOUNDS.maxLat,
    color: "#38bdf8", // sky blue
    fillColor: "rgba(56, 189, 248, 0.08)",
  },
  {
    id: "zone2",
    label: "Zone 2",
    description: "Central sector",
    minLon: DAM_BOUNDS.minLon + lonThird,
    maxLon: DAM_BOUNDS.minLon + lonThird * 2,
    minLat: DAM_BOUNDS.minLat,
    maxLat: DAM_BOUNDS.maxLat,
    color: "#a78bfa", // violet
    fillColor: "rgba(167, 139, 250, 0.08)",
  },
  {
    id: "zone3",
    label: "Zone 3",
    description: "Eastern sector",
    minLon: DAM_BOUNDS.minLon + lonThird * 2,
    maxLon: DAM_BOUNDS.maxLon,
    minLat: DAM_BOUNDS.minLat,
    maxLat: DAM_BOUNDS.maxLat,
    color: "#fb923c", // orange
    fillColor: "rgba(251, 146, 60, 0.08)",
  },
] as const;

export type ZoneId = (typeof ZONES)[number]["id"];
export type Zone = (typeof ZONES)[number];

export const ALERT_THRESHOLD = 3; // reports in a zone before alert fires

export function getZoneForReport(report: EnvironmentalReport): Zone | null {
  if (report.longitude == null || report.latitude == null) return null;
  return ZONES.find(
    (z) =>
      report.longitude! >= z.minLon &&
      report.longitude! <= z.maxLon &&
      report.latitude! >= z.minLat &&
      report.latitude! <= z.maxLat
  ) ?? null;
}

export interface ZoneCount {
  zone: Zone;
  count: number;
  reports: EnvironmentalReport[];
}

export function countReportsByZone(reports: EnvironmentalReport[]): ZoneCount[] {
  return ZONES.map((zone) => {
    const zoneReports = reports.filter((r) => {
      const z = getZoneForReport(r);
      return z?.id === zone.id;
    });
    return { zone, count: zoneReports.length, reports: zoneReports };
  });
}