import { useEffect, useMemo, useState } from "react";
import { fetchBudgets } from "../services/api";
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadBudgets = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetchBudgets(token);
        const payload = Array.isArray(response) ? response : [];
        if (isMounted) {
          setBudgets(payload);
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

    loadBudgets();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const hasBudgets = budgets.length > 0;

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

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>Presupuestos</h1>
          <p>Asignados a escuelas y viajes, con versión y PDF.</p>
        </div>
        <button type="button" className="btn">
          Nuevo
        </button>
      </header>

      <div className="card">
        <p>
          {isLoading
            ? "Cargando presupuestos desde la API..."
            : "Listado de presupuestos vinculados a cada viaje."}
        </p>
        {error ? <p className="form-error">{error}</p> : null}

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
