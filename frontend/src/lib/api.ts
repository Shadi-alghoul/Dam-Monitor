const explicitApiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;

export const API_BASE_URL = (explicitApiBase ?? "").replace(/\/$/, "");

export async function fetchImageNames(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/api/images`);
  if (!response.ok) {
    throw new Error("Failed to fetch image list from backend.");
  }

  return (await response.json()) as string[];
}

export function getSatelliteImageUrl(cacheBuster: number): string {
  return `${API_BASE_URL}/api/satellite?ts=${cacheBuster}`;
}

export function getStoredImageUrl(blobName: string): string {
  return `${API_BASE_URL}/api/images/${encodeURIComponent(blobName)}`;
}
