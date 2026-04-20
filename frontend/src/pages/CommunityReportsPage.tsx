import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchReports } from "../lib/api";
import PageHeader from "../components/PageHeader";
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

export default function CommunityReportsPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<EnvironmentalReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportError, setReportError] = useState<string | null>(null);
  const [communityFilter, setCommunityFilter] = useState<ProblemType | "">("");

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

  const filteredCommunityReports = reports.filter((report) => {
    if (!communityFilter) return true;
    return report.problemType === communityFilter;
  });

  return (
    <main className="dashboard-page">
      <PageHeader title="Community Reports" />

      <section className="panel">
        <h2>Report environmental issue</h2>
        <p>Found an environmental issue at the dam? Report it now!</p>
        <button onClick={() => navigate("/report")} style={{ marginTop: "1rem" }}>
          Report Issue
        </button>
      </section>

      {/* ── Map section: shows all geo-tagged reports as coloured pins ─────── */}
      <ReportsMapSection reports={reports} />

      <section className="panel">
        <div className="section-header">
          <h2 className="section-title">Community reports</h2>

          <div className="filter-group">
            <label htmlFor="community-filter" className="filter-label">
              Filter by type:
            </label>
            <div className="custom-select">
              <select
                id="community-filter"
                value={communityFilter}
                onChange={(e) => setCommunityFilter(e.target.value as ProblemType | "")}
              >
                <option value="">All Types</option>
                {PROBLEM_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loadingReports ? <p>Loading reports...</p> : null}
        {reportError ? <p className="form-error">{reportError}</p> : null}
        {!loadingReports && !reportError && filteredCommunityReports.length === 0 ? (
          <p>No reports match the selected filter.</p>
        ) : null}

        <div className="image-grid">
          {filteredCommunityReports.map((report) => (
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
