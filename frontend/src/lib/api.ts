import type { EnvironmentalReport, ProblemType } from "../types";

const explicitApiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;

export const API_BASE_URL = (explicitApiBase ?? "").replace(/\/$/, "");

export async function fetchImageNames(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/api/images`);
  if (!response.ok) {
    throw new Error("Failed to fetch image list from backend.");
  }

  return (await response.json()) as string[];
}

export async function fetchReports(): Promise<EnvironmentalReport[]> {
  const response = await fetch(`${API_BASE_URL}/api/reports`);
  if (!response.ok) {
    throw new Error("Failed to fetch reports from backend.");
  }

  return (await response.json()) as EnvironmentalReport[];
}

export async function fetchReport(reportId: string | number): Promise<EnvironmentalReport> {
  const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch report from backend.");
  }

  return (await response.json()) as EnvironmentalReport;
}

export async function uploadReport(payload: {
  file: File;
  description: string;
  problemType: ProblemType;
  satelliteImageUrl?: string;
  satelliteTakenAt?: string;
  latitude?: number;
  longitude?: number;
  pixelX?: number;
  pixelY?: number;
}): Promise<EnvironmentalReport> {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("description", payload.description);
  formData.append("problemType", payload.problemType);
  if (payload.latitude != null) formData.append("latitude", String(payload.latitude));
  if (payload.longitude != null) formData.append("longitude", String(payload.longitude));
  if (payload.pixelX != null) formData.append("pixelX", String(payload.pixelX));
  if (payload.pixelY != null) formData.append("pixelY", String(payload.pixelY));
  if (payload.satelliteImageUrl) {
    formData.append("satelliteImageUrl", payload.satelliteImageUrl);
  }
  if (payload.satelliteTakenAt) {
    formData.append("satelliteTakenAt", payload.satelliteTakenAt);
  }
  
  const response = await fetch(`${API_BASE_URL}/api/reports/upload`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const errorMessage = await response.text();
    throw new Error(errorMessage || "Failed to upload report.");
  }

  return (await response.json()) as EnvironmentalReport;
}

export async function fetchSatelliteSnapshot(cacheBuster: number): Promise<{
  objectUrl: string;
  acquiredAt: string | null;
  sourceCollection: string | null;
}> {
  const response = await fetch(`${API_BASE_URL}/api/satellite?ts=${cacheBuster}`);
  if (!response.ok) {
    throw new Error("Failed to fetch live satellite image from backend.");
  }

  const imageBlob = await response.blob();
  return {
    objectUrl: URL.createObjectURL(imageBlob),
    acquiredAt: response.headers.get("X-Image-Date"),
    sourceCollection: response.headers.get("X-Image-Collection")
  };
}

export function getStoredImageUrl(blobName: string): string {
  return `${API_BASE_URL}/api/images/${encodeURIComponent(blobName)}`;
}
