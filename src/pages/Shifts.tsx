import { useEffect, useState } from "react";
import { fetchShifts } from "../services/api";
import { useAuth } from "../state/AuthContext";

export function Shifts() {
  const { token } = useAuth();
  const [shifts, setShifts] = useState<Array<{ id: number; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadShifts = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetchShifts(token);
        const payload = Array.isArray(response) ? response : [];
        if (isMounted) {
          setShifts(payload);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setShifts([]);
          setError(err instanceof Error ? err.message : "No se pudieron cargar los turnos.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadShifts();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>Turnos</h1>
          <p>Listado de turnos disponibles.</p>
        </div>
        <button type="button" className="btn">
          Nuevo
        </button>
      </header>

      <div className="card">
        <p>{isLoading ? "Cargando turnos..." : "Turnos registrados."}</p>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="placeholder-table">
          <div className="table-row header">
            <span>Nombre</span>
            <span>Detalle</span>
            <span>Acciones</span>
          </div>
          {!isLoading && shifts.length === 0 ? (
            <div className="table-row">
              <span>No hay turnos cargados.</span>
              <span>Agregá un turno para comenzar.</span>
              <span>-</span>
            </div>
          ) : null}
          {shifts.map((shift) => (
            <div key={shift.id} className="table-row">
              <span>{shift.name}</span>
              <span>-</span>
              <span>
                <button type="button" className="link">
                  Ver
                </button>
                <button type="button" className="link">
                  Editar
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
