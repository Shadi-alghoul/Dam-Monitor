import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../lib/auth";

interface PageHeaderProps {
  title: string;
  eyebrow?: string;
}

export default function PageHeader({ title, eyebrow = "Dam Monitor" }: PageHeaderProps) {
  const navigate = useNavigate();
  const user = getCurrentUser();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function handleNavigation(path: string) {
    navigate(path);
  }

  return (
    <header className="dashboard-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="subtitle">Signed in as {user?.name ?? user?.email}</p>
      </div>

      <div className="header-actions">
        <button onClick={() => handleNavigation("/dashboard")} className="secondary">
          Dashboard
        </button>
        <button onClick={() => handleNavigation("/report")} className="secondary">
          Report Issue
        </button>
        <button onClick={handleLogout} className="secondary">
          Logout
        </button>
      </div>
    </header>
  );
}
