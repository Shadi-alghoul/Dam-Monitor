import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchReports, fetchSatelliteSnapshot, uploadReport } from "../lib/api";

import { getCurrentUser, logout } from "../lib/auth";
import ReportsMapSection from "../components/ReportsMapSection";
import type { EnvironmentalReport, ProblemType } from "../types";

const PROBLEM_TYPES: Array<{ value: ProblemType; label: string }> = [
  { value: "POLLUTION", label: "Pollution" },
  { value: "ALGAE_BLOOM", label: "Algae bloom" },
  { value: "WILDLIFE_DISTRESS", label: "Wildlife distress" },
  { value: "ILLEGAL_DUMPING", label: "Illegal dumping" },
  { value: "INFRASTRUCTURE_DAMAGE", label: "Infrastructure damage" },
  { value: "OTHER", label: "Other" }
];

// Hartbeespoort Dam satellite image bounds (matching backend SatelliteService)
const HARTBEESPOORT_BOUNDS = {
  minLon: 27.78822,
  minLat: -25.77346,
  maxLon: 27.907053,
  maxLat: -25.723519,
  width: 1920,
  height: 1080
};
/** Pixel-accurate position of the pin expressed as percentages of the
 *  rendered image container so the overlay stays aligned on any resize. */
interface PinPosition {
  /** Left offset as a fraction (0–1) of the container width */
  leftFraction: number;
  /** Top offset as a fraction (0–1) of the container height */
  topFraction: number;
  /** Natural-image pixel coordinates for display */
  pixelX: number;
  pixelY: number;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [cacheBuster, setCacheBuster] = useState(Date.now());
  const [satelliteResolution, setSatelliteResolution] = useState<{ width: number; height: number } | null>(null);
  const [selectedSatellitePixel, setSelectedSatellitePixel] = useState<{ x: number; y: number } | null>(null);
  const [selectedCoordinates, setSelectedCoordinates] = useState<{ lat: number; lon: number } | null>(null);
  const [satelliteImageSrc, setSatelliteImageSrc] = useState<string | null>(null);
  const [satelliteTakenAt, setSatelliteTakenAt] = useState<string | null>(null);
  const [satelliteCollection, setSatelliteCollection] = useState<string | null>(null);
  const [loadingSatellite, setLoadingSatellite] = useState(true);
  const [satelliteLoadError, setSatelliteLoadError] = useState<string | null>(null);
  const [reports, setReports] = useState<EnvironmentalReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportError, setReportError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [problemType, setProblemType] = useState<ProblemType>("POLLUTION");
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // ── Pin state ────────────────────────────────────────────────────────────
  const [pinPosition, setPinPosition] = useState<PinPosition | null>(null);

  // Zoom / pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const touchRef = useRef<{ dist: number; midX: number; midY: number } | null>(null);

  function resetZoom() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function onWrapperWheel(e: React.WheelEvent<HTMLDivElement>) {
    
    e.preventDefault();
    e.stopPropagation();
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    setZoom((prevZoom) => {
      const newZoom = Math.min(8, Math.max(1, prevZoom * factor));
      const scale = newZoom / prevZoom;
      setPan((p) => ({
        x: mx - scale * (mx - p.x),
        y: my - scale * (my - p.y),
      }));
      if (newZoom == 1) {
        setPan({ x: 0, y: 0 });
      }
      return newZoom;
    });
  }

  function onWrapperMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (zoom <= 1) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
  }

  function onWrapperMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!isDragging || !dragStartRef.current) return;
    setPan({
      x: dragStartRef.current.px + (e.clientX - dragStartRef.current.mx),
      y: dragStartRef.current.py + (e.clientY - dragStartRef.current.my),
    });
  }

  function onWrapperMouseUp() {
    setIsDragging(false);
    dragStartRef.current = null;
  }

  function onWrapperTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    if (e.touches.length !== 2) return;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    touchRef.current = {
      dist: Math.hypot(dx, dy),
      midX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
      midY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
    };
  }

  function onWrapperTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (e.touches.length !== 2 || !touchRef.current || !wrapperRef.current) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const newDist = Math.hypot(dx, dy);
    const factor = newDist / touchRef.current.dist;
    const rect = wrapperRef.current.getBoundingClientRect();
    const mx = touchRef.current.midX - rect.left;
    const my = touchRef.current.midY - rect.top;
    setZoom((prevZoom) => {
      const newZoom = Math.min(8, Math.max(1, prevZoom * factor));
      const scale = newZoom / prevZoom;
      setPan((p) => ({
        x: mx - scale * (mx - p.x),
        y: my - scale * (my - p.y),
      }));
      return newZoom;
    });
    touchRef.current.dist = newDist;
  }

  const takenAtLabel = useMemo(() => {
    if (!satelliteTakenAt) {
      return "Image taken: not available";
    }

    const parsed = new Date(satelliteTakenAt);
    if (Number.isNaN(parsed.getTime())) {
      return "Image taken: not available";
    }

    return `Image taken: ${parsed.toLocaleString()}`;
  }, [satelliteTakenAt]);

  /**
   * Convert pixel coordinates to geographic coordinates (lat/lon)
   * based on the satellite image bounds and dimensions.
   */
  const pixelToCoordinates = (pixelX: number, pixelY: number): { lat: number; lon: number } => {
    const { minLon, minLat, maxLon, maxLat, width, height } = HARTBEESPOORT_BOUNDS;
    const lon = minLon + (pixelX / width) * (maxLon - minLon);
    const lat = maxLat - (pixelY / height) * (maxLat - minLat); // Y increases downward in pixels
    return { lat, lon };
  };

  /**
   * Generate Google Maps URL for the selected coordinates.
   */
  const googleMapsUrl = useMemo(() => {
    if (!selectedCoordinates) return null;
    const { lat, lon } = selectedCoordinates;
    return `https://www.google.com/maps?q=${lat.toFixed(6)},${lon.toFixed(6)}&z=14`;
  }, [selectedCoordinates]);

  useEffect(() => {
    let isMounted = true;
    let currentObjectUrl: string | null = null;

    async function loadSatelliteSnapshot() {
      setLoadingSatellite(true);
      setSatelliteLoadError(null);
      setSatelliteCollection(null);

      try {
        const snapshot = await fetchSatelliteSnapshot(cacheBuster);
        if (!isMounted) {
          URL.revokeObjectURL(snapshot.objectUrl);
          return;
        }

        currentObjectUrl = snapshot.objectUrl;
        setSatelliteImageSrc((previous) => {
          if (previous) {
            URL.revokeObjectURL(previous);
          }
          return snapshot.objectUrl;
        });
        setSatelliteTakenAt(snapshot.acquiredAt);
        setSatelliteCollection(snapshot.sourceCollection);
      } catch (err) {
        if (isMounted) {
          setSatelliteLoadError(err instanceof Error ? err.message : "Unable to load live satellite image.");
        }
      } finally {
        if (isMounted) {
          setLoadingSatellite(false);
        }
      }
    }

    loadSatelliteSnapshot();

    return () => {
      isMounted = false;
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [cacheBuster]);

  // Reset selected coordinates when a new satellite image is loaded
  useEffect(() => {
    setSelectedSatellitePixel(null);
    setSelectedCoordinates(null);
  }, [cacheBuster]);

  useEffect(() => {
    let isMounted = true;

    async function loadReports() {
      setLoadingReports(true);
      setReportError(null);

      try {
        const loadedReports = await fetchReports();
        if (isMounted) {
          setReports(loadedReports);
        }
      } catch (err) {
        if (isMounted) {
          setReportError(err instanceof Error ? err.message : "Could not load reports.");
        }
      } finally {
        if (isMounted) {
          setLoadingReports(false);
        }
      }
    }

    loadReports();
    return () => {
      isMounted = false;
    };
  }, []);

  function onLogout() {
    logout();
    navigate("/login");
  }

  function refreshSatelliteImage() {
    setSatelliteLoadError(null);
    setSelectedSatellitePixel(null);
    setPinPosition(null);
    resetZoom();
    setCacheBuster(Date.now());
  }

  function onSatelliteImageClick(event: React.MouseEvent<HTMLImageElement>) {
    const imageElement = event.currentTarget;
    const naturalWidth = imageElement.naturalWidth;
    const naturalHeight = imageElement.naturalHeight;

    if (!naturalWidth || !naturalHeight) {
      return;
    }

    const bounds = imageElement.getBoundingClientRect();
    const renderedWidth = bounds.width;
    const renderedHeight = bounds.height;

    // object-fit: contain letterbox maths
    const scale = Math.min(renderedWidth / naturalWidth, renderedHeight / naturalHeight);
    const visibleWidth = naturalWidth * scale;
    const visibleHeight = naturalHeight * scale;
    const offsetX = (renderedWidth - visibleWidth) / 2;
    const offsetY = (renderedHeight - visibleHeight) / 2;

    const clickX = event.clientX - bounds.left;
    const clickY = event.clientY - bounds.top;
    const xInsideVisible = clickX - offsetX;
    const yInsideVisible = clickY - offsetY;

    if (xInsideVisible < 0 || yInsideVisible < 0 || xInsideVisible > visibleWidth || yInsideVisible > visibleHeight) {
      return;
    }

    const pixelX = Math.max(0, Math.min(naturalWidth - 1, Math.floor((xInsideVisible / visibleWidth) * naturalWidth)));
    const pixelY = Math.max(0, Math.min(naturalHeight - 1, Math.floor((yInsideVisible / visibleHeight) * naturalHeight)));

    setSelectedSatellitePixel({ x: pixelX, y: pixelY });

    const coords = pixelToCoordinates(pixelX, pixelY);
    setSelectedCoordinates(coords);

    // ── Compute pin position as fractions of the container element ──────
    // The container wraps the <img> and is the same size as the rendered img.
    // We store fractions so the pin repositions correctly after any CSS resize.
    const containerElement = imageElement.parentElement as HTMLElement;
    const containerBounds = containerElement.getBoundingClientRect();

    const leftFraction = (event.clientX - containerBounds.left) / containerBounds.width;
    const topFraction = (event.clientY - containerBounds.top) / containerBounds.height;

    // Replace any existing pin with the new position
    setPinPosition({ leftFraction, topFraction, pixelX, pixelY });
  }

  async function onReportSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadError(null);
    setUploadSuccess(null);

    if (!selectedFile) {
      setUploadError("Please select an image file.");
      return;
    }
    if (!description.trim()) {
      setUploadError("Please add a short description.");
      return;
    }

    setSubmitting(true);
    try {
      await uploadReport({
        file: selectedFile,
        description,
        problemType,
        satelliteImageUrl: satelliteImageSrc || undefined,
        satelliteTakenAt: satelliteTakenAt || undefined,
        // Pass the clicked map location — undefined when the user hasn't clicked yet
        latitude: selectedCoordinates?.lat,
        longitude: selectedCoordinates?.lon,
        pixelX: selectedSatellitePixel?.x,
        pixelY: selectedSatellitePixel?.y
      });
      const refreshed = await fetchReports();
      setReports(refreshed);
      setSelectedFile(null);
      setDescription("");
      setProblemType("POLLUTION");
      setUploadSuccess("Report submitted successfully.");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Dam Monitor</p>
          <h1>Satellite Imaging Dashboard</h1>
          <p className="subtitle">Signed in as {user?.name ?? user?.email}</p>
        </div>

        <div className="header-actions">
          <button onClick={refreshSatelliteImage}>Refresh live image</button>
          <button className="secondary" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <section className="panel">
        <h2>Live satellite snapshot</h2>
        <p className="satellite-meta">{takenAtLabel}</p>
        {satelliteCollection ? <p className="satellite-meta">Satellite source: {satelliteCollection}</p> : null}
        {satelliteResolution ? (
          <p className="satellite-meta">
            Resolution: {satelliteResolution.width} x {satelliteResolution.height}
          </p>
        ) : null}
        {selectedSatellitePixel ? (
          <>
          <p className="satellite-meta highlight">
            Selected pixel: ({selectedSatellitePixel.x}, {selectedSatellitePixel.y})
          </p>
            {selectedCoordinates && (
              <>
                <p className="satellite-meta highlight">
                  Coordinates: {selectedCoordinates.lat.toFixed(6)}, {selectedCoordinates.lon.toFixed(6)}
                </p>
                <p className="satellite-meta">
                  <a
                    href={googleMapsUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#0066cc", textDecoration: "underline" }}
                  >
                    View in Google Maps →
                  </a>
                </p>
              </>
            )}
          </>
        ) : (
          <p className="satellite-meta">Click the image to select a location for your report.</p>
        )}
        {loadingSatellite ? <p className="satellite-meta">Loading live image...</p> : null}
        {satelliteLoadError ? <p className="form-error">{satelliteLoadError}</p> : null}

        {/* Zoom hint */}
        <p className="satellite-meta" style={{ fontSize: "0.78rem", color: "#64748b" }}>
          Scroll to zoom · Drag to pan when zoomed
          {zoom > 1 && (
            <span>
              {" "}· <strong style={{ color: "#a7f3d0" }}>{Math.round(zoom * 100)}%</strong>
            </span>
          )}
        </p>

        {/* Satellite image wrapper with zoom + pin overlay */}
        <div
          ref={wrapperRef}
          className="satellite-image-wrapper"
          style={{ cursor: isDragging ? "grabbing" : zoom > 1 ? "grab" : "crosshair" }}
          onWheel={onWrapperWheel}
          onMouseDown={onWrapperMouseDown}
          onMouseMove={onWrapperMouseMove}
          onMouseUp={onWrapperMouseUp}
          onMouseLeave={onWrapperMouseUp}
          onTouchStart={onWrapperTouchStart}
          onTouchMove={onWrapperTouchMove}
        >
          {/* Inner div receives the CSS transform — both image and pin scale together */}
          <div
            className="satellite-zoom-inner"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
            }}
          >
            <img
              className="hero-image"
              src={satelliteImageSrc ?? ""}
              alt="Live satellite imagery"
              draggable={false}
              onClick={isDragging ? undefined : onSatelliteImageClick}
              onLoad={(event) => {
                const imageElement = event.currentTarget;
                setSatelliteResolution({ width: imageElement.naturalWidth, height: imageElement.naturalHeight });
              }}
              onError={(event) => {
                event.currentTarget.alt = "Unable to load live satellite image";
                setSatelliteLoadError("Unable to load live satellite image.");
              }}
            />

            {/* Pin lives inside the zoom container so it moves with the image */}
            {pinPosition && (
              <div
                className="satellite-pin"
                style={{
                  left: `${pinPosition.leftFraction * 100}%`,
                  top: `${pinPosition.topFraction * 100}%`,
                }}
                aria-label={`Pin at pixel (${pinPosition.pixelX}, ${pinPosition.pixelY})`}
              >
                <svg
                  className="satellite-pin__icon"
                  viewBox="0 0 24 36"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M12 0C5.373 0 0 5.373 0 12c0 8.284 10.667 22.628 11.134 23.243a1.1 1.1 0 0 0 1.732 0C13.333 34.628 24 20.284 24 12 24 5.373 18.627 0 12 0z"
                    fill="#ef4444"
                  />
                  <circle cx="12" cy="12" r="5" fill="white" />
                </svg>
                <span className="satellite-pin__label">
                  {pinPosition.pixelX}, {pinPosition.pixelY}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Controls row */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {zoom >= 1 && (
            <button className="secondary pin-clear-btn" onClick={resetZoom}>
              Reset zoom
            </button>
          )}
          {pinPosition && (
            <button
              className="secondary pin-clear-btn"
              onClick={() => {
                setPinPosition(null);
                setSelectedSatellitePixel(null);
              }}
            >
              Clear pin
            </button>
          )}
        </div>
      </section>

      <section className="panel">
        <h2>Report environmental issue</h2>

        {/* Nudge the user to pick a location before submitting */}
        {!selectedCoordinates && (
          <p className="satellite-meta" style={{ color: "#fbbf24" }}>
            ⚠ Click the satellite image above to pin a location before submitting.
          </p>
        )}

        <form className="report-form" onSubmit={onReportSubmit}>
          <label>
            Photo
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] ?? null);
              }}
            />
          </label>

          <label>
            Problem type
            <select
              value={problemType}
              onChange={(event) => {
                setProblemType(event.target.value as ProblemType);
              }}
            >
              {PROBLEM_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Description
            <textarea
              rows={4}
              maxLength={1000}
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
              }}
              placeholder="Describe what is happening at the dam..."
            />
          </label>

          {/* Show the pinned location summary inside the form */}
          {selectedCoordinates && selectedSatellitePixel && (
            <p className="satellite-meta highlight" style={{ fontSize: "0.85rem" }}>
              📍 Pinned: pixel ({selectedSatellitePixel.x}, {selectedSatellitePixel.y}) →{" "}
              {selectedCoordinates.lat.toFixed(6)}, {selectedCoordinates.lon.toFixed(6)}
            </p>
          )}

          <button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit report"}
          </button>

          {uploadError ? <p className="form-error">{uploadError}</p> : null}
          {uploadSuccess ? <p className="form-success">{uploadSuccess}</p> : null}
        </form>
      </section>

      {/* ── Map section: shows all geo-tagged reports as coloured pins ─────── */}
      <ReportsMapSection reports={reports} />

      <section className="panel">
        <h2>Community reports</h2>

        {loadingReports ? <p>Loading reports...</p> : null}
        {reportError ? <p className="form-error">{reportError}</p> : null}
        {!loadingReports && !reportError && reports.length === 0 ? <p>No reports submitted yet.</p> : null}

        <div className="image-grid">
          {reports.map((report) => (
            <article key={report.id} className="image-card">
              <img src={report.imageUrl} alt={report.problemType} loading="lazy" />
              <p className="report-type">{report.problemType.replaceAll("_", " ")}</p>
              <p className="report-description">{report.description}</p>
              {report.latitude != null && report.longitude != null && (
                <p className="report-meta">
                  📍 {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                </p>
              )}
              {report.satelliteTakenAt && (
                <p className="report-meta">Satellite image: {new Date(report.satelliteTakenAt).toLocaleString()}</p>
              )}
              <p className="report-meta">Reported: {new Date(report.createdAt).toLocaleString()}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}