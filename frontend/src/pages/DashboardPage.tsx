import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchImageNames, getSatelliteImageUrl, getStoredImageUrl } from "../lib/api";
import { getCurrentUser, logout } from "../lib/auth";

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [cacheBuster, setCacheBuster] = useState(Date.now());
  const [imageNames, setImageNames] = useState<string[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const satelliteImageUrl = useMemo(() => getSatelliteImageUrl(cacheBuster), [cacheBuster]);

  useEffect(() => {
    let isMounted = true;

    async function loadImages() {
      setLoadingList(true);
      setListError(null);

      try {
        const names = await fetchImageNames();
        if (isMounted) {
          setImageNames(names);
        }
      } catch (err) {
        if (isMounted) {
          setListError(err instanceof Error ? err.message : "Could not load image list.");
        }
      } finally {
        if (isMounted) {
          setLoadingList(false);
        }
      }
    }

    loadImages();
    return () => {
      isMounted = false;
    };
  }, []);

  function onLogout() {
    logout();
    navigate("/login");
  }

  function refreshSatelliteImage() {
    setCacheBuster(Date.now());
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
        <img
          className="hero-image"
          src={satelliteImageUrl}
          alt="Live satellite imagery"
          onError={(event) => {
            event.currentTarget.alt = "Unable to load live satellite image";
          }}
        />
      </section>

      <section className="panel">
        <h2>Stored images</h2>

        {loadingList ? <p>Loading saved imagery...</p> : null}
        {listError ? <p className="form-error">{listError}</p> : null}
        {!loadingList && !listError && imageNames.length === 0 ? <p>No stored images found.</p> : null}

        <div className="image-grid">
          {imageNames.map((name) => (
            <article key={name} className="image-card">
              <img src={getStoredImageUrl(name)} alt={name} loading="lazy" />
              <p title={name}>{name}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
