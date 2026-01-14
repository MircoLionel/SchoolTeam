import { useEffect, useState } from "react";
import { extractCount, fetchAudit, fetchPassengers, fetchTrips } from "../services/api";
import { useAuth } from "../state/AuthContext";
import { Role } from "../types/auth";

interface DashboardCounts {
  trips: number | null;
  passengers: number | null;
  audits: number | null;
}

const roleMessages: Record<Role, string> = {
  [Role.ADMIN]: "Tenés acceso completo a caja, proveedores y auditoría.",
  [Role.OFFICE]: "Solo ves cobranzas y estados por pasajero.",
  [Role.READONLY]: "Podés descargar listados filtrados sin editar."
};

export function Dashboard() {
  const { user, token } = useAuth();
  const [counts, setCounts] = useState<DashboardCounts>({
    trips: null,
    passengers: null,
    audits: null
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      if (!user || !token) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const [tripsResponse, passengersResponse, auditResponse] = await Promise.all([
          fetchTrips(token),
          fetchPassengers(token),
          user.role === Role.ADMIN ? fetchAudit(token) : Promise.resolve(null)
        ]);

        if (!isMounted) {
          return;
        }

        setCounts({
          trips: extractCount(tripsResponse),
          passengers: extractCount(passengersResponse),
          audits: extractCount(auditResponse)
        });
      } catch (error) {
        if (isMounted) {
          setCounts({ trips: null, passengers: null, audits: null });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [user, token]);

  const formatCount = (value: number | null) => {
    if (isLoading) {
      return "Cargando...";
    }
    if (value === null) {
      return "Sin datos";
    }
    return value;
  };

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Resumen operativo con datos del backend.</p>
        </div>
        <div className="badge">Rol: {user?.role ?? "-"}</div>
      </header>

      <div className="grid">
        <article className="card">
          <h2>Viajes activos</h2>
          <p>{formatCount(counts.trips)} registros en el sistema.</p>
          <button type="button" className="btn">
            Gestionar viajes
          </button>
        </article>
        <article className="card">
          <h2>Pasajeros registrados</h2>
          <p>{formatCount(counts.passengers)} pasajeros cargados.</p>
          <button type="button" className="btn">
            Ver pasajeros
          </button>
        </article>
        <article className="card">
          <h2>Auditoría</h2>
          <p>{formatCount(counts.audits)} eventos recientes.</p>
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
          <li>Datos cargados desde la API autenticada.</li>
          <li>Reportes globales restringidos a Admin.</li>
        </ul>
      </div>
    </section>
  );
}
