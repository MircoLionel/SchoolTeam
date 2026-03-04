import { FormEvent, useEffect, useState } from "react";
import { createGrade, fetchGrades } from "../services/api";
import { useAuth } from "../state/AuthContext";

export function Grades() {
  const { token } = useAuth();
  const [grades, setGrades] = useState<Array<{ id: number; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !newName.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      const created = await createGrade(token, { name: newName.trim() });
      setGrades((previous) => [...previous, created]);
      setNewName("");
      setIsCreating(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el grado.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>Grados</h1>
          <p>Listado de grados disponibles.</p>
        </div>
        <button type="button" className="btn" onClick={() => setIsCreating((current) => !current)}>
          {isCreating ? "Cancelar" : "Nuevo"}
        </button>
      </header>

      {isCreating ? (
        <form className="card form-grid" onSubmit={handleCreate}>
          <label className="field">
            <span>Nombre</span>
            <input value={newName} onChange={(event) => setNewName(event.target.value)} required />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn" disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar grado"}
            </button>
          </div>
        </form>
      ) : null}

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
