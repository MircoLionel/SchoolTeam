import { useAuth } from "../state/AuthContext";
import { Role } from "../types/auth";

const roleMessages: Record<Role, string> = {
  [Role.ADMIN]: "Tenés acceso completo a caja, proveedores y auditoría.",
  [Role.OFFICE]: "Solo ves cobranzas y estados por pasajero.",
  [Role.READONLY]: "Podés descargar listados filtrados sin editar."
};

export function Dashboard() {
  const { user } = useAuth();

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Resumen operativo del día y accesos rápidos.</p>
        </div>
        <div className="badge">Rol: {user?.role ?? "-"}</div>
      </header>

      <div className="grid">
        <article className="card">
          <h2>Viajes activos</h2>
          <p>27 grupos en operación para 2025.</p>
          <button type="button" className="btn">
            Gestionar viajes
          </button>
        </article>
        <article className="card">
          <h2>Cobros pendientes</h2>
          <p>53 cupones listos para cobrar en efectivo.</p>
          <button type="button" className="btn">
            Ir a cobros
          </button>
        </article>
        <article className="card">
          <h2>Auditoría</h2>
          <p>Últimas acciones críticas auditadas.</p>
          <button type="button" className="btn">
            Ver auditoría
          </button>
        </article>
      </div>

      <div className="card">
        <h3>Permisos</h3>
        <p>{user ? roleMessages[user.role] : "No hay sesión activa."}</p>
        <ul>
          <li>Acceso por rol aplicado en rutas y menús.</li>
          <li>Cobros en efectivo y no efectivo separados.</li>
          <li>Reportes globales restringidos a Admin.</li>
        </ul>
      </div>
    </section>
  );
}
