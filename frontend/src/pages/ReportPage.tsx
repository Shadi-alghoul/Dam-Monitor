import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchSatelliteSnapshot, uploadReport } from "../lib/api";
import PageHeader from "../components/PageHeader";
import type { ProblemType } from "../types";

const PROBLEM_TYPES: Array<{ value: ProblemType; label: string }> = [
  { value: "POLLUTION", label: "Pollution" },
  { value: "ALGAE_BLOOM", label: "Algae bloom" },
  { value: "WILDLIFE_DISTRESS", label: "Wildlife distress" },
  { value: "ILLEGAL_DUMPING", label: "Illegal dumping" },
  { value: "INFRASTRUCTURE_DAMAGE", label: "Infrastructure damage" },
  { value: "OTHER", label: "Other" }
];

 
interface PinPosition {
  leftFraction: number;
  topFraction: number;
  pixelX: number;
  pixelY: number;
}

export default function ReportPage() {
  const navigate = useNavigate();
  const [cacheBuster, setCacheBuster] = useState(Date.now());
  const [satelliteResolution, setSatelliteResolution] = useState<{ width: number; height: number } | null>(null);
  const [selectedSatellitePixel, setSelectedSatellitePixel] = useState<{ x: number; y: number } | null>(null);
  const [selectedCoordinates, setSelectedCoordinates] = useState<{ lat: number; lon: number } | null>(null);
  const [satelliteImageSrc, setSatelliteImageSrc] = useState<string | null>(null);
  const [satelliteTakenAt, setSatelliteTakenAt] = useState<string | null>(null);
  const [satelliteCollection, setSatelliteCollection] = useState<string | null>(null);
  const [loadingSatellite, setLoadingSatellite] = useState(true);
  const [satelliteLoadError, setSatelliteLoadError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [problemType, setProblemType] = useState<ProblemType>("POLLUTION");
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [pinPosition, setPinPosition] = useState<PinPosition | null>(null);

  // Zoom / pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const touchRef = useRef<{ dist: number; midX: number; midY: number } | null>(null);

  // Hartbeespoort Dam satellite image bounds
  const HARTBEESPOORT_BOUNDS = {
    minLon: 27.78822,
    minLat: -25.77346,
    maxLon: 27.907053,
    maxLat: -25.723519,
    width: satelliteResolution?.width ?? 1188,
    height: satelliteResolution?.height ?? 499
  };

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

  const takenAtLabel = new Date(satelliteTakenAt || "").toLocaleString() || "Image taken: not available";

  const pixelToCoordinates = (pixelX: number, pixelY: number): { lat: number; lon: number } => {
    const { minLon, minLat, maxLon, maxLat, width, height } = HARTBEESPOORT_BOUNDS;
    const lon = minLon + (pixelX / width) * (maxLon - minLon);
    const lat = maxLat - (pixelY / height) * (maxLat - minLat);
    return { lat, lon };
  };

  const googleMapsUrl = selectedCoordinates
    ? `https://www.google.com/maps?q=${selectedCoordinates.lat.toFixed(6)},${selectedCoordinates.lon.toFixed(6)}&z=14`
    : null;

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

  useEffect(() => {
    setSelectedSatellitePixel(null);
    setSelectedCoordinates(null);
  }, [cacheBuster]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

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

    const containerElement = imageElement.parentElement as HTMLElement;
    const containerBounds = containerElement.getBoundingClientRect();

    const leftFraction = (event.clientX - containerBounds.left) / containerBounds.width;
    const topFraction = (event.clientY - containerBounds.top) / containerBounds.height;

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
        latitude: selectedCoordinates?.lat,
        longitude: selectedCoordinates?.lon,
        pixelX: selectedSatellitePixel?.x,
        pixelY: selectedSatellitePixel?.y
      });

      setSelectedFile(null);
      setDescription("");
      setProblemType("POLLUTION");
      setUploadSuccess("Report submitted successfully. Redirecting to dashboard...");

      // Cleanup preview URL
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setImagePreviewUrl(null);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="dashboard-page">
      <PageHeader title="Report Environmental Issue" />

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

        <p className="satellite-meta" style={{ fontSize: "0.78rem", color: "#64748b" }}>
          Scroll to zoom · Drag to pan when zoomed
          {zoom > 1 && (
            <span>
              {" "}· <strong style={{ color: "#a7f3d0" }}>{Math.round(zoom * 100)}%</strong>
            </span>
          )}
        </p>

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
          <button className="secondary pin-clear-btn" onClick={refreshSatelliteImage}>
            Refresh live image
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Report environmental issue</h2>

        <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "0.5rem", padding: "1rem", marginBottom: "1.5rem" }}>
          <p style={{ margin: 0, fontSize: "0.95rem", color: "#1e40af" }}>
            <strong>How to report:</strong>
          </p>
          <ol style={{ margin: "0.5rem 0 0 0", paddingLeft: "1.5rem", fontSize: "0.9rem", color: "#1e40af" }}>
            <li>Click on the satellite map above to tag the location of the issue</li>
            <li>Upload a photo showing the problem</li>
            <li>Fill in the details and submit</li>
          </ol>
        </div>

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
                const file = event.target.files?.[0] ?? null;
                setSelectedFile(file);
                
                // Clean up old preview URL and create new one
                if (imagePreviewUrl) {
                  URL.revokeObjectURL(imagePreviewUrl);
                }
                if (file) {
                  setImagePreviewUrl(URL.createObjectURL(file));
                } else {
                  setImagePreviewUrl(null);
                }
              }}
            />
          </label>

          {imagePreviewUrl && (
            <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "#f1f5f9", borderRadius: "0.5rem" }}>
              <p style={{ fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem" }}>📸 Image Preview:</p>
              <img
                src={imagePreviewUrl}
                alt="Preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: "300px",
                  borderRadius: "0.25rem",
                  border: "1px solid #cbd5e1"
                }}
              />
              <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.5rem" }}>
                {selectedFile?.name} ({selectedFile ? (selectedFile.size / 1024).toFixed(2) : 0} KB)
              </p>
            </div>
          )}

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

        {/* Summary section showing tagged location with uploaded image */}
        {selectedCoordinates && selectedSatellitePixel && imagePreviewUrl && (
          <div style={{ 
            marginTop: "2rem", 
            padding: "1.5rem", 
            backgroundColor: "#f0fdf4", 
            border: "2px solid #86efac", 
            borderRadius: "0.5rem"
          }}>
            <h3 style={{ marginTop: 0, color: "#166534" }}>📍 Report Summary</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <p style={{ fontSize: "0.9rem", fontWeight: "600", margin: "0 0 0.5rem 0" }}>Tagged Location:</p>
                <div style={{ 
                  backgroundColor: "white", 
                  padding: "0.75rem", 
                  borderRadius: "0.25rem", 
                  border: "1px solid #bbf7d0"
                }}>
                  <p style={{ margin: "0.25rem 0", fontSize: "0.85rem", color: "#000" }}>
                    <strong>Coordinates:</strong><br/>
                    {selectedCoordinates.lat.toFixed(6)}, {selectedCoordinates.lon.toFixed(6)}
                  </p>
                  <p style={{ margin: "0.25rem 0", fontSize: "0.85rem", color: "#000" }}>
                    <strong>Pixel Position:</strong><br/>
                    ({selectedSatellitePixel.x}, {selectedSatellitePixel.y})
                  </p>
                  <p style={{ margin: "0.5rem 0 0 0", color: "#000" }}>
                    <a
                      href={googleMapsUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#0066cc", textDecoration: "underline", fontSize: "0.85rem" }}
                    >
                      View in Google Maps →
                    </a>
                  </p>
                </div>
              </div>
              <div>
                <p style={{ fontSize: "0.9rem", fontWeight: "600", margin: "0 0 0.5rem 0" }}>Uploaded Image:</p>
                <img
                  src={imagePreviewUrl}
                  alt="Preview"
                  style={{
                    width: "100%",
                    maxHeight: "200px",
                    objectFit: "cover",
                    borderRadius: "0.25rem",
                    border: "1px solid #bbf7d0"
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
