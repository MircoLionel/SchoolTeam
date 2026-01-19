import { FormEvent, useEffect, useState } from "react";
import { createSchool, deleteSchool, fetchSchools, School } from "../services/api";
import { useAuth } from "../state/AuthContext";

export function Schools() {
  const { token } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [name, setName] = useState("");
  const [locality, setLocality] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const data = await fetchSchools(token);
        setSchools(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar las escuelas.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setError("No hay sesión activa.");
      return;
    }
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    setIsSaving(true);
    try {
      const newSchool = await createSchool(token, {
        name: name.trim(),
        locality: locality.trim() || null,
        address: address.trim() || null
      });
      setSchools((prev) => [...prev, newSchool]);
      setName("");
      setLocality("");
      setAddress("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la escuela.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) {
      setError("No hay sesión activa.");
      return;
    }
    if (!window.confirm("¿Querés eliminar esta escuela?")) {
      return;
    }

    try {
      await deleteSchool(token, id);
      setSchools((prev) => prev.filter((school) => school.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la escuela.");
    }
  };

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>Escuelas</h1>
          <p>Gestión de instituciones vinculadas a los viajes.</p>
        </div>
      </header>

      <form className="card form-grid" onSubmit={handleSubmit}>
        <div className="form-row">
          <label className="field">
            <span>Nombre</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="field">
            <span>Localidad</span>
            <input value={locality} onChange={(event) => setLocality(event.target.value)} />
          </label>
          <label className="field">
            <span>Dirección</span>
            <input value={address} onChange={(event) => setAddress(event.target.value)} />
          </label>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn" disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar escuela"}
          </button>
        </div>
      </form>

      <div className="card">
        <div className="placeholder-table">
          <div className="table-row header">
            <span>Nombre</span>
            <span>Localidad</span>
            <span>Acciones</span>
          </div>
          {isLoading ? (
            <div className="table-row">
              <span>Cargando...</span>
              <span>-</span>
              <span />
            </div>
          ) : schools.length === 0 ? (
            <div className="table-row">
              <span>Sin escuelas</span>
              <span>Agregá la primera escuela.</span>
              <span />
            </div>
          ) : (
            schools.map((school) => (
              <div key={school.id} className="table-row">
                <span>{school.name}</span>
                <span>{school.locality ?? "-"}</span>
                <span>
                  <button
                    type="button"
                    className="link"
                    onClick={() => handleDelete(school.id)}
                  >
                    Eliminar
                  </button>
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
