import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchReports, fetchSatelliteSnapshot, uploadReport } from "../lib/api";
import { getCurrentUser, logout } from "../lib/auth";
import type { EnvironmentalReport, ProblemType } from "../types";

const PROBLEM_TYPES: Array<{ value: ProblemType; label: string }> = [
  { value: "POLLUTION", label: "Pollution" },
  { value: "ALGAE_BLOOM", label: "Algae bloom" },
  { value: "WILDLIFE_DISTRESS", label: "Wildlife distress" },
  { value: "ILLEGAL_DUMPING", label: "Illegal dumping" },
  { value: "INFRASTRUCTURE_DAMAGE", label: "Infrastructure damage" },
  { value: "OTHER", label: "Other" }
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [cacheBuster, setCacheBuster] = useState(Date.now());
  const [satelliteImageSrc, setSatelliteImageSrc] = useState<string | null>(null);
  const [satelliteTakenAt, setSatelliteTakenAt] = useState<string | null>(null);
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

  useEffect(() => {
    let isMounted = true;
    let currentObjectUrl: string | null = null;

    async function loadSatelliteSnapshot() {
      setLoadingSatellite(true);
      setSatelliteLoadError(null);

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
    setCacheBuster(Date.now());
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
      const created = await uploadReport({
        file: selectedFile,
        description,
        problemType,
        satelliteImageUrl: satelliteImageSrc || undefined,
        satelliteTakenAt: satelliteTakenAt || undefined
      });
      setReports((prev) => [created, ...prev]);
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
        {loadingSatellite ? <p className="satellite-meta">Loading live image...</p> : null}
        {satelliteLoadError ? <p className="form-error">{satelliteLoadError}</p> : null}
        <img
          className="hero-image"
          src={satelliteImageSrc ?? ""}
          alt="Live satellite imagery"
          onError={(event) => {
            event.currentTarget.alt = "Unable to load live satellite image";
            setSatelliteLoadError("Unable to load live satellite image.");
          }}
        />
      </section>

      <section className="panel">
        <h2>Report environmental issue</h2>

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

          <button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit report"}
          </button>

          {uploadError ? <p className="form-error">{uploadError}</p> : null}
          {uploadSuccess ? <p className="form-success">{uploadSuccess}</p> : null}
        </form>
      </section>

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
