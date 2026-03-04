import { FormEvent, useEffect, useMemo, useState } from "react";
import { createTrip, fetchGrades, fetchSchools, fetchTrips } from "../services/api";
import { useAuth } from "../state/AuthContext";

interface TripRecord {
  id: number;
  destination: string;
  group_name: string;
  year: number;
  school?: { name: string } | null;
  latestBudget?: { base_price_100: number; version: number } | null;
}

interface OptionItem {
  id: number;
  name: string;
}

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
    group_name: "",
    year: String(new Date().getFullYear())
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
    () =>
      Boolean(
        form.school_id &&
        form.grade_id &&
        form.destination.trim() &&
        form.group_name.trim() &&
        form.year.trim()
      ),
    [form]
  );

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !isFormReady) {
      return;
    }

    setIsSaving(true);
    try {
      const created = await createTrip(token, {
        school_id: Number(form.school_id),
        grade_id: Number(form.grade_id),
        destination: form.destination.trim(),
        group_name: form.group_name.trim(),
        year: Number(form.year)
      });

      setTrips((previous) => [...previous, ...(Array.isArray(created) ? [] : [created as TripRecord])]);
      setIsCreating(false);
      setForm({
        school_id: "",
        grade_id: "",
        destination: "",
        group_name: "",
        year: String(new Date().getFullYear())
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
          <p>Viajes y presupuestos asociados.</p>
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
              <span>Grado</span>
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
              <span>Grupo salida</span>
              <input
                value={form.group_name}
                onChange={(event) => setForm((current) => ({ ...current, group_name: event.target.value }))}
                required
              />
            </label>
            <label className="field">
              <span>Destino</span>
              <input
                value={form.destination}
                onChange={(event) => setForm((current) => ({ ...current, destination: event.target.value }))}
                required
              />
            </label>
            <label className="field">
              <span>Año</span>
              <input
                type="number"
                value={form.year}
                onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))}
                required
              />
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
        {newNotice ? <p className="badge">{newNotice}</p> : null}
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
                {trip.destination} ({trip.year})
                {trip.latestBudget ? ` - V${trip.latestBudget.version}` : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
