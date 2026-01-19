import { FormEvent, useEffect, useState } from "react";
import {
  createPassengerType,
  deletePassengerType,
  fetchPassengerTypes,
  PassengerType
} from "../services/api";
import { useAuth } from "../state/AuthContext";

export function PassengerTypes() {
  const { token } = useAuth();
  const [types, setTypes] = useState<PassengerType[]>([]);
  const [name, setName] = useState("");
  const [percentage, setPercentage] = useState("");
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
        const data = await fetchPassengerTypes(token);
        setTypes(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar los tipos.");
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
    const value = Number(percentage);
    if (Number.isNaN(value) || value < 0 || value > 100) {
      setError("El porcentaje debe estar entre 0 y 100.");
      return;
    }

    setIsSaving(true);
    try {
      const newType = await createPassengerType(token, {
        name: name.trim(),
        percentage: value
      });
      setTypes((prev) => [...prev, newType]);
      setName("");
      setPercentage("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el tipo.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) {
      setError("No hay sesión activa.");
      return;
    }
    if (!window.confirm("¿Querés eliminar este tipo de pasajero?")) {
      return;
    }

    try {
      await deletePassengerType(token, id);
      setTypes((prev) => prev.filter((type) => type.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el tipo.");
    }
  };

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>Tipos de pasajero</h1>
          <p>Definí porcentajes para alumnos, docentes u otros perfiles.</p>
        </div>
      </header>

      <form className="card form-grid" onSubmit={handleSubmit}>
        <div className="form-row">
          <label className="field">
            <span>Nombre</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="field">
            <span>Porcentaje</span>
            <input
              type="number"
              min="0"
              max="100"
              value={percentage}
              onChange={(event) => setPercentage(event.target.value)}
            />
          </label>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn" disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar tipo"}
          </button>
        </div>
      </form>

      <div className="card">
        <div className="placeholder-table">
          <div className="table-row header">
            <span>Nombre</span>
            <span>Porcentaje</span>
            <span>Acciones</span>
          </div>
          {isLoading ? (
            <div className="table-row">
              <span>Cargando...</span>
              <span>-</span>
              <span />
            </div>
          ) : types.length === 0 ? (
            <div className="table-row">
              <span>Sin tipos</span>
              <span>Agregá el primero.</span>
              <span />
            </div>
          ) : (
            types.map((type) => (
              <div key={type.id} className="table-row">
                <span>{type.name}</span>
                <span>{type.percentage}%</span>
                <span>
                  <button type="button" className="link" onClick={() => handleDelete(type.id)}>
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
