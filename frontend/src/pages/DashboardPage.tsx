import { useEffect, useRef, useState } from "react";
import { fetchSatelliteSnapshot } from "../lib/api";

import PageHeader from "../components/PageHeader";

export default function DashboardPage() {
  const [cacheBuster] = useState(Date.now());
  const [satelliteResolution, setSatelliteResolution] = useState<{ width: number; height: number } | null>(null);
  const [satelliteImageSrc, setSatelliteImageSrc] = useState<string | null>(null);
  const [satelliteTakenAt, setSatelliteTakenAt] = useState<string | null>(null);
  const [satelliteCollection, setSatelliteCollection] = useState<string | null>(null);
  const [loadingSatellite, setLoadingSatellite] = useState(true);
  const [satelliteLoadError, setSatelliteLoadError] = useState<string | null>(null);

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

  // Load satellite snapshot on mount and when cacheBuster changes
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



  return (
    <main className="dashboard-page">
      <PageHeader title="Satellite Imaging Dashboard" />

      <section className="panel">
        <h2>Live satellite snapshot</h2>
        {satelliteTakenAt && (
          <p className="satellite-meta">
            Image taken: {new Date(satelliteTakenAt).toLocaleString()}
          </p>
        )}
        {satelliteCollection ? <p className="satellite-meta">Satellite source: {satelliteCollection}</p> : null}
        {satelliteResolution ? (
          <p className="satellite-meta">
            Resolution: {satelliteResolution.width} x {satelliteResolution.height}
          </p>
        ) : null}
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

        {/* Satellite image wrapper with zoom (view-only) */}
        <div
          ref={wrapperRef}
          className="satellite-image-wrapper"
          style={{ cursor: isDragging ? "grabbing" : zoom > 1 ? "grab" : "default" }}
          onWheel={onWrapperWheel}
          onMouseDown={onWrapperMouseDown}
          onMouseMove={onWrapperMouseMove}
          onMouseUp={onWrapperMouseUp}
          onMouseLeave={onWrapperMouseUp}
          onTouchStart={onWrapperTouchStart}
          onTouchMove={onWrapperTouchMove}
        >
          {/* Inner div receives the CSS transform */}
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
              onLoad={(event) => {
                const imageElement = event.currentTarget;
                setSatelliteResolution({ width: imageElement.naturalWidth, height: imageElement.naturalHeight });
              }}
              onError={(event) => {
                event.currentTarget.alt = "Unable to load live satellite image";
                setSatelliteLoadError("Unable to load live satellite image.");
              }}
            />
          </div>
        </div>

        {/* Controls row */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {zoom >= 1 && (
            <button className="secondary pin-clear-btn" onClick={resetZoom}>
              Reset zoom
            </button>
          )}
        </div>
      </section>
    </main>
  );
}