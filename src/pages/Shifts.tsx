import { FormEvent, useEffect, useState } from "react";
import { createShift, deleteShift, fetchShifts, Shift } from "../services/api";
import { useAuth } from "../state/AuthContext";

export function Shifts() {
  const { token } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
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
        const data = await fetchShifts(token);
        setShifts(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar los turnos.");
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
      const newShift = await createShift(token, { name: name.trim() });
      setShifts((prev) => [...prev, newShift]);
      setName("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el turno.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) {
      setError("No hay sesión activa.");
      return;
    }
    if (!window.confirm("¿Querés eliminar este turno?")) {
      return;
    }

    try {
      await deleteShift(token, id);
      setShifts((prev) => prev.filter((shift) => shift.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el turno.");
    }
  };

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>Turnos</h1>
          <p>Definí los turnos de salida o cursada.</p>
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
            {isSaving ? "Guardando..." : "Guardar turno"}
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
          ) : shifts.length === 0 ? (
            <div className="table-row">
              <span>Sin turnos</span>
              <span>Agregá el primero.</span>
              <span />
            </div>
          ) : (
            shifts.map((shift) => (
              <div key={shift.id} className="table-row">
                <span>{shift.name}</span>
                <span>Turno operativo</span>
                <span>
                  <button type="button" className="link" onClick={() => handleDelete(shift.id)}>
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
