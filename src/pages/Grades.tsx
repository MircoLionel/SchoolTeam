import { useEffect, useState } from "react";
import { fetchGrades } from "../services/api";
import { useAuth } from "../state/AuthContext";

export function Grades() {
  const { token } = useAuth();
  const [grades, setGrades] = useState<Array<{ id: number; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadGrades = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetchGrades(token);
        const payload = Array.isArray(response) ? response : [];
        if (isMounted) {
          setGrades(payload);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setGrades([]);
          setError(err instanceof Error ? err.message : "No se pudieron cargar los grados.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadGrades();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>Grados</h1>
          <p>Listado de grados disponibles.</p>
        </div>
        <button type="button" className="btn">
          Nuevo
        </button>
      </header>

      <div className="card">
        <p>{isLoading ? "Cargando grados..." : "Grados registrados."}</p>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="placeholder-table">
          <div className="table-row header">
            <span>Nombre</span>
            <span>Detalle</span>
            <span>Acciones</span>
          </div>
          {!isLoading && grades.length === 0 ? (
            <div className="table-row">
              <span>No hay grados cargados.</span>
              <span>Agregá un grado para comenzar.</span>
              <span>-</span>
            </div>
          ) : null}
          {grades.map((grade) => (
            <div key={grade.id} className="table-row">
              <span>{grade.name}</span>
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
