import { useEffect, useState } from "react";
import { fetchTrips } from "../services/api";
import { useAuth } from "../state/AuthContext";

interface TripRecord {
  id: number;
  destination: string;
  group_name: string;
  year: number;
  school?: { name: string } | null;
  latestBudget?: { base_price_100: number; version: number } | null;
}

export function Trips() {
  const { token } = useAuth();
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadTrips = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetchTrips(token);
        const payload = Array.isArray(response) ? response : [];
        if (isMounted) {
          setTrips(payload);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setTrips([]);
          setError(err instanceof Error ? err.message : "No se pudieron cargar los viajes.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadTrips();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>Viajes</h1>
          <p>Viajes y presupuestos asociados.</p>
        </div>
        <button type="button" className="btn">
          Nuevo
        </button>
      </header>

      <div className="card">
        <p>{isLoading ? "Cargando viajes..." : "Viajes registrados."}</p>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="placeholder-table">
          <div className="table-row header">
            <span>Escuela</span>
            <span>Grupo salida</span>
            <span>Destino / Año</span>
          </div>
          {!isLoading && trips.length === 0 ? (
            <div className="table-row">
              <span>No hay viajes cargados.</span>
              <span>Agregá un viaje para comenzar.</span>
              <span>-</span>
            </div>
          ) : null}
          {trips.map((trip) => (
            <div key={trip.id} className="table-row">
              <span>{trip.school?.name ?? "Sin escuela"}</span>
              <span>{trip.group_name}</span>
              <span>
                {trip.destination} ({trip.year}){trip.latestBudget
                  ? ` - V${trip.latestBudget.version}`
                  : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
