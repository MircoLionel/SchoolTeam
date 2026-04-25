import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createBudget, createTrip, extractCollection, fetchBudgets, fetchGrades, fetchSchools, fetchTrips, updateBudget } from "../services/api";
import { useAuth } from "../state/AuthContext";

interface TripRecord {
  id: number;
  contract_number?: string;
  destination: string;
  group_name: string;
  year: number;
  trip_value?: number;
  price_per_passenger?: number;
  estimated_date?: string | null;
  school?: { name: string } | null;
  grade?: { id: number; name: string } | null;
}
interface OptionItem { id: number; name: string }
interface BudgetRecord {
  id: number;
  trip_id: number;
  base_price_100: number;
  suggested_installments?: number;
  version?: number;
  status?: string;
}

export function Trips() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [schools, setSchools] = useState<OptionItem[]>([]);
  const [grades, setGrades] = useState<OptionItem[]>([]);
  const [tripPrices, setTripPrices] = useState<Record<number, number>>({});
  const [budgetsByTrip, setBudgetsByTrip] = useState<Record<number, BudgetRecord>>({});
  const [visibleAdvanced, setVisibleAdvanced] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    school_id: "",
    grade_id: "",
    contract_number: "",
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
        const [tripsResponse, schoolsResponse, gradesResponse, budgetsResponse] = await Promise.all([
          fetchTrips(token),
          fetchSchools(token),
          fetchGrades(token),
          fetchBudgets(token),
        ]);

        if (isMounted) {
          const tripItems = extractCollection<TripRecord>(tripsResponse);
          const budgetItems = extractCollection<BudgetRecord>(budgetsResponse);
          const budgetMap: Record<number, BudgetRecord> = {};

          budgetItems.forEach((budget) => {
            if (!budget?.trip_id) return;
            const current = budgetMap[budget.trip_id];
            if (!current || Number(budget.version ?? 0) >= Number(current.version ?? 0)) {
              budgetMap[budget.trip_id] = budget;
            }
          });

          const prices: Record<number, number> = {};
          tripItems.forEach((trip) => {
            const budget = budgetMap[trip.id];
            const backendPrice = Number(
              budget?.base_price_100
              ?? trip.price_per_passenger
              ?? trip.trip_value
              ?? 0
            );
            prices[trip.id] = backendPrice;
          });

          setTrips(tripItems);
          setBudgetsByTrip(budgetMap);
          setTripPrices(prices);
          setSchools(Array.isArray(schoolsResponse) ? schoolsResponse : []);
          setGrades(Array.isArray(gradesResponse) ? gradesResponse : []);
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

  const selectedGrade = grades.find((grade) => String(grade.id) === form.grade_id);

  const isFormReady = useMemo(
    () => Boolean(form.school_id && form.grade_id && form.contract_number.trim() && form.destination.trim() && form.estimated_date),
    [form]
  );

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !isFormReady || !selectedGrade) {
      return;
    }

    setIsSaving(true);
    try {
      const estimatedDate = new Date(form.estimated_date);
      const created = await createTrip(token, {
        school_id: Number(form.school_id),
        grade_id: Number(form.grade_id),
        destination: form.destination.trim(),
        contract_number: form.contract_number.trim(),
        group_name: selectedGrade.name,
        year: estimatedDate.getUTCFullYear()
      });

      if (!Array.isArray(created)) {
        setTrips((previous) => [
          ...previous,
          {
            ...(created as TripRecord),
            estimated_date: form.estimated_date,
            group_name: selectedGrade.name,
            grade: { id: selectedGrade.id, name: selectedGrade.name }
          }
        ]);
      }

      setIsCreating(false);
      setForm({
        school_id: "",
        grade_id: "",
        contract_number: "",
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

  const updateTripPrice = async (tripId: number, value: string) => {
    const parsed = Number(value);
    if (!token || !Number.isFinite(parsed) || parsed <= 0) return;

    setTripPrices((current) => ({ ...current, [tripId]: parsed }));

    try {
      const existingBudget = budgetsByTrip[tripId];

      if (existingBudget?.id) {
        await updateBudget(token, existingBudget.id, {
          base_price_100: parsed,
        });

        setBudgetsByTrip((current) => ({
          ...current,
          [tripId]: { ...existingBudget, base_price_100: parsed },
        }));
      } else {
        const created = await createBudget(token, {
          trip_id: tripId,
          base_price_100: parsed,
          suggested_installments: 6,
          version: 1,
          status: "presentado",
        });

        const budget = created as BudgetRecord;
        if (budget?.id) {
          setBudgetsByTrip((current) => ({ ...current, [tripId]: budget }));
        }
      }

      setTrips((current) =>
        current.map((trip) =>
          trip.id === tripId
            ? { ...trip, trip_value: parsed, price_per_passenger: parsed }
            : trip
        )
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el precio del viaje.");
    }
  };

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>Viajes</h1>
          <p>Grupo/salida asociado solamente al grado o año.</p>
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
              <span>Grupo/salida (grado o año)</span>
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
              <span>Contrato Nº interno</span>
              <input
                value={form.contract_number}
                onChange={(event) => setForm((current) => ({ ...current, contract_number: event.target.value }))}
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
              <input value={selectedGrade?.name ?? ""} readOnly />
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
          <div className="table-row header trips-row">
            <span>Escuela</span>
            <span>Grupo/salida</span>
            <span>Descripción</span>
            <span>Pasajeros</span>
          </div>
          {!isLoading && trips.length === 0 ? (
            <div className="table-row trips-row">
              <span>No hay viajes cargados.</span>
              <span>-</span>
              <span>-</span>
              <span>-</span>
            </div>
          ) : null}
          {trips.map((trip) => (
            <div key={trip.id} className="table-row trips-row trip-row-extended">
              <span>{trip.school?.name ?? "Sin escuela"}</span>
              <span>{trip.grade?.name ?? trip.group_name ?? String(trip.year)}</span>
              <span>
                {trip.destination} - Fecha estimada:{" "}
                {trip.estimated_date
                  ? new Date(`${trip.estimated_date}T00:00:00`).toLocaleDateString("es-AR")
                  : String(trip.year)}
                {trip.contract_number ? ` · Contrato Nº ${trip.contract_number}` : ""}
              </span>
              <span>
                <button
                  type="button"
                  className="link"
                  onClick={() => navigate(`/trip-passengers?tripId=${trip.id}`)}
                >
                  Ver pasajeros
                </button>
                <button
                  type="button"
                  className="link"
                  onClick={() =>
                    setVisibleAdvanced((current) => ({
                      ...current,
                      [trip.id]: !current[trip.id]
                    }))
                  }
                >
                  Opciones ocultas
                </button>
                {visibleAdvanced[trip.id] ? (
                  <label className="field inline-field">
                    <span>Precio viaje por chico</span>
                    <input
                      type="number"
                      min="1"
                      defaultValue={tripPrices[trip.id] ?? Number(trip.price_per_passenger ?? trip.trip_value ?? 0)}
                      onBlur={(event) => {
                        void updateTripPrice(trip.id, event.target.value);
                      }}
                    />
                  </label>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
