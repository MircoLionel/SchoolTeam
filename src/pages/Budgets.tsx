import { FormEvent, useEffect, useMemo, useState } from "react";
import { createBudget, fetchBudgets, fetchTrips } from "../services/api";
import { useAuth } from "../state/AuthContext";

interface BudgetSchool {
  id: number;
  name: string;
}

interface BudgetTrip {
  id: number;
  group_name: string;
  destination: string;
  year: number;
  school?: BudgetSchool | null;
}

interface BudgetItem {
  id: number;
  base_price_100: number;
  suggested_installments: number;
  version: number;
  status: string;
  trip?: BudgetTrip | null;
}

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2
});

export function Budgets() {
  const { token } = useAuth();
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [trips, setTrips] = useState<BudgetTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newNotice] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    trip_id: "",
    base_price_100: "",
    suggested_installments: "6",
    version: "1",
    status: "draft"
  });

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const [budgetsResponse, tripsResponse] = await Promise.all([
          fetchBudgets(token),
          fetchTrips(token)
        ]);

        const budgetPayload = Array.isArray(budgetsResponse) ? budgetsResponse : [];
        const tripPayload = Array.isArray(tripsResponse) ? tripsResponse : [];

        if (isMounted) {
          setBudgets(budgetPayload);
          setTrips(tripPayload);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setBudgets([]);
          setError(err instanceof Error ? err.message : "No se pudieron cargar los presupuestos.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const hasBudgets = budgets.length > 0;
  const isFormReady =
    form.trip_id &&
    form.base_price_100.trim() &&
    form.suggested_installments.trim() &&
    form.version.trim();

  const rows = useMemo(
    () =>
      budgets.map((budget) => {
        const trip = budget.trip;
        const schoolName = trip?.school?.name ?? "Sin escuela";
        const groupName = trip?.group_name ?? "Sin grupo";
        const destination = trip?.destination ?? "Sin destino";
        const year = trip?.year ? String(trip.year) : "";

        return {
          id: budget.id,
          schoolName,
          groupName,
          destination: year ? `${destination} (${year})` : destination,
          version: `V${budget.version}`,
          basePrice: currencyFormatter.format(budget.base_price_100),
          status: budget.status ?? "-"
        };
      }),
    [budgets]
  );

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !isFormReady) {
      return;
    }

    setIsSaving(true);
    try {
      const created = await createBudget(token, {
        trip_id: Number(form.trip_id),
        base_price_100: Number(form.base_price_100),
        suggested_installments: Number(form.suggested_installments),
        version: Number(form.version),
        status: form.status
      });

      if (!Array.isArray(created)) {
        setBudgets((previous) => [...previous, created as BudgetItem]);
      }

      setForm({
        trip_id: "",
        base_price_100: "",
        suggested_installments: "6",
        version: "1",
        status: "draft"
      });
      setIsCreating(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el presupuesto.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>Presupuestos</h1>
          <p>Asignados a escuelas y viajes, con versión y PDF.</p>
        </div>
        <button type="button" className="btn" onClick={() => setIsCreating((current) => !current)}>
          {isCreating ? "Cancelar" : "Nuevo"}
        </button>
      </header>

      {isCreating ? (
        <form className="card form-grid" onSubmit={handleCreate}>
          <div className="form-row">
            <label className="field">
              <span>Viaje</span>
              <select
                value={form.trip_id}
                onChange={(event) => setForm((current) => ({ ...current, trip_id: event.target.value }))}
                required
              >
                <option value="">Seleccionar</option>
                {trips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.school?.name ?? "Sin escuela"} - {trip.group_name} - {trip.destination} ({trip.year})
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Precio base</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.base_price_100}
                onChange={(event) => setForm((current) => ({ ...current, base_price_100: event.target.value }))}
                required
              />
            </label>
            <label className="field">
              <span>Cuotas sugeridas</span>
              <input
                type="number"
                min="1"
                value={form.suggested_installments}
                onChange={(event) =>
                  setForm((current) => ({ ...current, suggested_installments: event.target.value }))
                }
                required
              />
            </label>
            <label className="field">
              <span>Versión</span>
              <input
                type="number"
                min="1"
                value={form.version}
                onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))}
                required
              />
            </label>
          </div>

          <div className="form-row">
            <label className="field">
              <span>Estado</span>
              <input
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              />
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn" disabled={isSaving || !isFormReady}>
              {isSaving ? "Guardando..." : "Guardar presupuesto"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="card">
        <p>
          {isLoading
            ? "Cargando presupuestos desde la API..."
            : "Listado de presupuestos vinculados a cada viaje."}
        </p>
        {error ? <p className="form-error">{error}</p> : null}
        {newNotice ? <p className="badge">{newNotice}</p> : null}

        <div className="placeholder-table budget-table">
          <div className="table-row header">
            <span>Escuela</span>
            <span>Grupo salida</span>
            <span>Destino / Año</span>
            <span>Versión</span>
            <span>Precio base</span>
            <span>Estado</span>
          </div>
          {!isLoading && !hasBudgets ? (
            <div className="table-row">
              <span>No hay presupuestos cargados.</span>
              <span>Agregá un presupuesto para comenzar.</span>
              <span>-</span>
              <span>-</span>
              <span>-</span>
              <span>-</span>
            </div>
          ) : null}
          {rows.map((row) => (
            <div key={row.id} className="table-row">
              <span>{row.schoolName}</span>
              <span>{row.groupName}</span>
              <span>{row.destination}</span>
              <span>{row.version}</span>
              <span>{row.basePrice}</span>
              <span>{row.status}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
