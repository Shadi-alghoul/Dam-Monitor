import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchReport } from "../lib/api";
import PageHeader from "../components/PageHeader";
import type { EnvironmentalReport, ProblemType } from "../types";
import "../styles/report-status.css";

const PROBLEM_LABELS: Record<ProblemType, string> = {
  POLLUTION: "Pollution",
  ALGAE_BLOOM: "Algae Bloom",
  WILDLIFE_DISTRESS: "Wildlife Distress",
  ILLEGAL_DUMPING: "Illegal Dumping",
  INFRASTRUCTURE_DAMAGE: "Infrastructure Damage",
  OTHER: "Other",
};

export default function ReportStatusPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<EnvironmentalReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadReport() {
      if (!reportId) {
        setError("Invalid report ID");
        setLoading(false);
        return;
      }

      try {
        const loaded = await fetchReport(reportId);
        if (isMounted) {
          setReport(loaded);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load report");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadReport();
    return () => {
      isMounted = false;
    };
  }, [reportId]);

  const getStatusClass = (): string => {
    if (loading) return "loading";
    if (error) return "error";
    if (!report) return "error";
    return report.aiApproved ? "approved" : "rejected";
  };

  const getStatusIcon = (): string => {
    if (loading) return "⏳";
    if (error) return "⚠️";
    if (!report) return "⚠️";
    return report.aiApproved ? "✓" : "✗";
  };

  const getStatusTitle = (): string => {
    if (loading) return "Processing Report...";
    if (error) return "Error Loading Report";
    if (!report) return "Report Not Found";
    return report.aiApproved
      ? "Report Approved!"
      : "Report Not Approved";
  };

  const getStatusMessage = (): string => {
    if (loading) return "The AI is analyzing your report. This may take a moment...";
    if (error) return error;
    if (!report) return "The requested report could not be found.";
    return report.aiApproved
      ? "Your environmental report has been validated and approved by our AI system. Thank you for contributing to dam monitoring!"
      : "Your report was analyzed by our AI system but did not meet validation criteria. Review the details below.";
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const googleMapsUrl = report && report.latitude && report.longitude
    ? `https://www.google.com/maps?q=${report.latitude.toFixed(6)},${report.longitude.toFixed(6)}&z=14`
    : null;

  return (
    <main className="dashboard-page report-status-page">
      <PageHeader title="Report Status" />

      <div className="status-container">
        {/* Status Box */}
        <div className={`status-box ${getStatusClass()}`}>
          {loading ? (
            <div className="spinner"></div>
          ) : (
            <div className="status-icon">{getStatusIcon()}</div>
          )}
          <h2>{getStatusTitle()}</h2>
          <p>{getStatusMessage()}</p>

          {!loading && !error && report && report.aiRejectionReason && (
            <div className="reason">
              <strong>AI Feedback:</strong>
              {report.aiRejectionReason}
            </div>
          )}

          {!loading && !error && report && (
            <p className="poll-info">Report ID: {report.id}</p>
          )}
        </div>

        {/* Report Preview Section */}
        {!loading && !error && report && (
          <div className="report-preview">
            <h2>Report Details</h2>

            <div className="preview-content">
              {/* Report Image */}
              <div className="preview-image">
                <img
                  src={report.imageUrl}
                  alt="Report image"
                  style={{ maxWidth: "300px", borderRadius: "8px" }}
                />
              </div>

              {/* Report Info */}
              <div className="preview-info">
                <div className="info-row">
                  <strong>Issue Type:</strong>
                  <span>{PROBLEM_LABELS[report.problemType]}</span>
                </div>

                <div className="info-row">
                  <strong>Description:</strong>
                  <span>{report.description}</span>
                </div>

                <div className="info-row">
                  <strong>Submitted:</strong>
                  <span>{formatDate(report.createdAt)}</span>
                </div>

                {report.latitude !== null && report.latitude !== undefined && 
                 report.longitude !== null && report.longitude !== undefined && (
                  <div className="info-row">
                    <strong>Location:</strong>
                    <span>
                      {report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}
                      {googleMapsUrl && (
                        <>
                          {" "}
                          <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#0066cc", marginLeft: "8px" }}
                          >
                            View on Map →
                          </a>
                        </>
                      )}
                    </span>
                  </div>
                )}

                {report.pixelX !== null && report.pixelX !== undefined &&
                 report.pixelY !== null && report.pixelY !== undefined && (
                  <div className="info-row">
                    <strong>Pixel Coordinates:</strong>
                    <span>({report.pixelX}, {report.pixelY})</span>
                  </div>
                )}

                {report.satelliteImageUrl && (
                  <div className="info-row">
                    <strong>Satellite Image:</strong>
                    <span>
                      <a
                        href={report.satelliteImageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#0066cc" }}
                      >
                        View Image
                      </a>
                    </span>
                  </div>
                )}

                {report.satelliteTakenAt && (
                  <div className="info-row">
                    <strong>Satellite Image Date:</strong>
                    <span>{formatDate(report.satelliteTakenAt)}</span>
                  </div>
                )}

                <div className="info-row">
                  <strong>AI Validation:</strong>
                  <span>
                    {report.aiApproved ? (
                      <span style={{ color: "#28a745", fontWeight: "bold" }}>
                        ✓ Approved
                      </span>
                    ) : (
                      <span style={{ color: "#dc3545", fontWeight: "bold" }}>
                        ✗ Not Approved
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Satellite Preview */}
            {report.satelliteImageUrl && (
              <div style={{ marginTop: "30px", paddingTop: "30px", borderTop: "1px solid #ddd" }}>
                <h3>Satellite Image Context</h3>
                <img
                  src={report.satelliteImageUrl}
                  alt="Satellite context"
                  style={{
                    maxWidth: "100%",
                    height: "auto",
                    borderRadius: "8px",
                    maxHeight: "400px",
                  }}
                />
                {report.satelliteTakenAt && (
                  <p style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>
                    Satellite image from {formatDate(report.satelliteTakenAt)}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {!loading && (
          <div
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "center",
              marginTop: "20px",
            }}
          >
            <button
              onClick={() => navigate("/community")}
              style={{
                padding: "10px 20px",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              View All Reports
            </button>
            <button
              onClick={() => navigate("/report")}
              style={{
                padding: "10px 20px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Submit Another Report
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
