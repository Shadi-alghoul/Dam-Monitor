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

export async function uploadReport(payload: {
  file: File;
  description: string;
  problemType: ProblemType;
}): Promise<EnvironmentalReport> {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("description", payload.description);
  formData.append("problemType", payload.problemType);

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
}> {
  const response = await fetch(`${API_BASE_URL}/api/satellite?ts=${cacheBuster}`);
  if (!response.ok) {
    throw new Error("Failed to fetch live satellite image from backend.");
  }

  const imageBlob = await response.blob();
  return {
    objectUrl: URL.createObjectURL(imageBlob),
    acquiredAt: response.headers.get("X-Satellite-Taken-At")
  };
}

export function getStoredImageUrl(blobName: string): string {
  return `${API_BASE_URL}/api/images/${encodeURIComponent(blobName)}`;
}
