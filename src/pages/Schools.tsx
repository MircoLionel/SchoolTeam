import { FormEvent, useEffect, useState } from "react";
import { createSchool, fetchSchools } from "../services/api";
import { useAuth } from "../state/AuthContext";

export function Schools() {
  const { token } = useAuth();
  const [schools, setSchools] = useState<Array<{ id: number; name: string; locality?: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLocality, setNewLocality] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadSchools = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetchSchools(token);
        const payload = Array.isArray(response) ? response : [];
        if (isMounted) {
          setSchools(payload);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setSchools([]);
          setError(err instanceof Error ? err.message : "No se pudieron cargar las escuelas.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSchools();

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
      const created = await createSchool(token, {
        name: newName.trim(),
        locality: newLocality.trim() || null,
        address: null
      });
      setSchools((previous) => [...previous, created]);
      setNewName("");
      setNewLocality("");
      setIsCreating(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la escuela.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>Escuelas</h1>
          <p>Listado de escuelas cargadas en el sistema.</p>
        </div>
        <button type="button" className="btn" onClick={() => setIsCreating((current) => !current)}>
          {isCreating ? "Cancelar" : "Nuevo"}
        </button>
      </header>

      {isCreating ? (
        <form className="card form-grid" onSubmit={handleCreate}>
          <div className="form-row">
            <label className="field">
              <span>Nombre</span>
              <input value={newName} onChange={(event) => setNewName(event.target.value)} required />
            </label>
            <label className="field">
              <span>Localidad</span>
              <input value={newLocality} onChange={(event) => setNewLocality(event.target.value)} />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn" disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar escuela"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="card">
        <p>{isLoading ? "Cargando escuelas..." : "Escuelas registradas."}</p>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="placeholder-table">
          <div className="table-row header">
            <span>Nombre</span>
            <span>Localidad</span>
            <span>Acciones</span>
          </div>
          {!isLoading && schools.length === 0 ? (
            <div className="table-row">
              <span>No hay escuelas cargadas.</span>
              <span>Agregá una escuela para comenzar.</span>
              <span>-</span>
            </div>
          ) : null}
          {schools.map((school) => (
            <div key={school.id} className="table-row">
              <span>{school.name}</span>
              <span>{school.locality ?? "-"}</span>
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
