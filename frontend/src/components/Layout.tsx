import { ReactNode, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay${sidebarOpen ? " open" : ""}`}
        onClick={closeSidebar}
      />

      {/* Mobile header */}
      <div className="mobile-header">
        <button
          className="hamburger"
          style={{ display: "flex", color: "#94a3b8" }}
          onClick={() => setSidebarOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
        <span className="mobile-header-title">Cloud Task Intake</span>
      </div>

      <div className="app-shell">
        {/* Sidebar */}
        <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
          <div className="sidebar-logo">
            <Link to="/" onClick={closeSidebar}>
              <div className="sidebar-logo-icon">CT</div>
              <span>Cloud Task Intake</span>
            </Link>
          </div>

          <nav className="sidebar-nav">
            <span className="sidebar-section-label">Navigation</span>

            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                isActive ? "active" : ""
              }
              onClick={closeSidebar}
            >
              <span>▤</span>
              Dashboard
            </NavLink>

            <NavLink
              to="/tasks/new"
              className={({ isActive }) =>
                isActive ? "active" : ""
              }
              onClick={closeSidebar}
            >
              <span>＋</span>
              New Task
            </NavLink>
          </nav>

          <div className="sidebar-footer">
            {user && (
              <div className="sidebar-user" title={user.email}>
                {user.email}
              </div>
            )}
            <button
              className="sidebar-nav-item"
              onClick={handleLogout}
              style={{ color: "#f87171" }}
            >
              <span>⎋</span>
              Log out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="main-content">{children}</main>
      </div>
    </>
  );
}
