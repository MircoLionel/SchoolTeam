import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { Role } from "../types/auth";
import { NAV_SECTIONS } from "../data/navigation";

export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div>
          <div className="brand">
            <span>School Team Turismo</span>
            <small>Panel Operativo</small>
          </div>
          <nav>
            {NAV_SECTIONS.map((section) => (
              <div key={section.label} className="nav-section">
                <p>{section.label}</p>
                {section.links
                  .filter((link) => !link.roles || (user && link.roles.includes(user.role)))
                  .map((link) => (
                    <NavLink key={link.to} to={link.to}>
                      {link.label}
                    </NavLink>
                  ))}
              </div>
            ))}
          </nav>
        </div>
        <div className="sidebar-footer">
          <div>
            <strong>{user?.name ?? "Sin sesión"}</strong>
            <span>{user?.role ?? Role.READONLY}</span>
          </div>
          <button type="button" className="btn" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
