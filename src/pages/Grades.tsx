import { FormEvent, useEffect, useState } from "react";
import { createGrade, deleteGrade, fetchGrades, Grade } from "../services/api";
import { useAuth } from "../state/AuthContext";

export function Grades() {
  const { token } = useAuth();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [name, setName] = useState("");
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
        const data = await fetchGrades(token);
        setGrades(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar los grados.");
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
      const newGrade = await createGrade(token, { name: name.trim() });
      setGrades((prev) => [...prev, newGrade]);
      setName("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el grado.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) {
      setError("No hay sesión activa.");
      return;
    }
    if (!window.confirm("¿Querés eliminar este grado?")) {
      return;
    }

    try {
      await deleteGrade(token, id);
      setGrades((prev) => prev.filter((grade) => grade.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el grado.");
    }
  };

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>Grados</h1>
          <p>Administrá los grados o cursos disponibles.</p>
        </div>
      </header>

      <form className="card form-grid" onSubmit={handleSubmit}>
        <div className="form-row">
          <label className="field">
            <span>Nombre</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn" disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar grado"}
          </button>
        </div>
      </form>

      <div className="card">
        <div className="placeholder-table">
          <div className="table-row header">
            <span>Nombre</span>
            <span>Detalle</span>
            <span>Acciones</span>
          </div>
          {isLoading ? (
            <div className="table-row">
              <span>Cargando...</span>
              <span>-</span>
              <span />
            </div>
          ) : grades.length === 0 ? (
            <div className="table-row">
              <span>Sin grados</span>
              <span>Agregá el primero.</span>
              <span />
            </div>
          ) : (
            grades.map((grade) => (
              <div key={grade.id} className="table-row">
                <span>{grade.name}</span>
                <span>Curso activo</span>
                <span>
                  <button type="button" className="link" onClick={() => handleDelete(grade.id)}>
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
