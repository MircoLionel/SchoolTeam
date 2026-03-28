import { FormEvent, useEffect, useMemo, useState } from "react";
import { createTrip, fetchGrades, fetchSchools, fetchTrips } from "../services/api";
import { useAuth } from "../state/AuthContext";

interface TripRecord {
  id: number;
  destination: string;
  group_name: string;
  year: number;
  estimated_date?: string | null;
  school?: { name: string } | null;
}

interface OptionItem {
  id: number;
  name: string;
}

const DEFAULT_GROUP_NAME = "Todos los grados · Todos los turnos · Todos los pasajeros";

export function Trips() {
  const { token } = useAuth();
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [schools, setSchools] = useState<OptionItem[]>([]);
  const [grades, setGrades] = useState<OptionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    school_id: "",
    grade_id: "",
    destination: "",
    estimated_date: ""
  });

  useEffect(() => {
    let isMounted = true;
    const loadTrips = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const [tripsResponse, schoolsResponse, gradesResponse] = await Promise.all([
          fetchTrips(token),
          fetchSchools(token),
          fetchGrades(token)
        ]);

        const tripPayload = Array.isArray(tripsResponse) ? tripsResponse : [];
        const schoolPayload = Array.isArray(schoolsResponse) ? schoolsResponse : [];
        const gradePayload = Array.isArray(gradesResponse) ? gradesResponse : [];

        if (isMounted) {
          setTrips(tripPayload);
          setSchools(schoolPayload);
          setGrades(gradePayload);
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

  const isFormReady = useMemo(
    () => Boolean(form.school_id && form.grade_id && form.destination.trim() && form.estimated_date),
    [form]
  );

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !isFormReady) {
      return;
    }

    setIsSaving(true);
    try {
      const estimatedDate = new Date(form.estimated_date);
      const created = await createTrip(token, {
        school_id: Number(form.school_id),
        grade_id: Number(form.grade_id),
        destination: form.destination.trim(),
        group_name: DEFAULT_GROUP_NAME,
        year: estimatedDate.getUTCFullYear()
      });

      const createdTrip = Array.isArray(created) ? null : (created as TripRecord);
      if (createdTrip) {
        setTrips((previous) => [
          ...previous,
          {
            ...createdTrip,
            estimated_date: form.estimated_date,
            group_name: createdTrip.group_name || DEFAULT_GROUP_NAME
          }
        ]);
      }

      setIsCreating(false);
      setForm({
        school_id: "",
        grade_id: "",
        destination: "",
        estimated_date: ""
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el viaje.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>Viajes</h1>
          <p>Grupo salida unificado para todos los grados, turnos y pasajeros.</p>
        </div>
        <button type="button" className="btn" onClick={() => setIsCreating((current) => !current)}>
          {isCreating ? "Cancelar" : "Nuevo"}
        </button>
      </header>

      {isCreating ? (
        <form className="card form-grid" onSubmit={handleCreate}>
          <div className="form-row">
            <label className="field">
              <span>Escuela</span>
              <select
                value={form.school_id}
                onChange={(event) => setForm((current) => ({ ...current, school_id: event.target.value }))}
                required
              >
                <option value="">Seleccionar</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Grado de referencia</span>
              <select
                value={form.grade_id}
                onChange={(event) => setForm((current) => ({ ...current, grade_id: event.target.value }))}
                required
              >
                <option value="">Seleccionar</option>
                {grades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-row">
            <label className="field">
              <span>Destino</span>
              <input
                value={form.destination}
                onChange={(event) => setForm((current) => ({ ...current, destination: event.target.value }))}
                required
              />
            </label>
            <label className="field">
              <span>Fecha estimada</span>
              <input
                type="date"
                value={form.estimated_date}
                onChange={(event) => setForm((current) => ({ ...current, estimated_date: event.target.value }))}
                required
              />
            </label>
            <label className="field">
              <span>Grupo salida</span>
              <input value={DEFAULT_GROUP_NAME} readOnly />
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn" disabled={isSaving || !isFormReady}>
              {isSaving ? "Guardando..." : "Guardar viaje"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="card">
        <p>{isLoading ? "Cargando viajes..." : "Viajes registrados."}</p>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="placeholder-table trips-table">
          <div className="table-row header">
            <span>Escuela</span>
            <span>Grupo salida</span>
            <span>Descripción</span>
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
              <span>{trip.group_name || DEFAULT_GROUP_NAME}</span>
              <span>
                {trip.destination} - Fecha estimada:{" "}
                {trip.estimated_date
                  ? new Date(`${trip.estimated_date}T00:00:00`).toLocaleDateString("es-AR")
                  : String(trip.year)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
