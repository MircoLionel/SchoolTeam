import { useMemo } from "react";
import { readCashIncomes } from "../state/passengersStorage";

interface CashCategory {
  label: string;
  amount: number;
  color: string;
}

const categories: CashCategory[] = [
  { label: "Sueldos", amount: 240000, color: "#6b7280" },
  { label: "Combustible", amount: 91000, color: "#2563eb" },
  { label: "Mantenimiento", amount: 54000, color: "#16a34a" },
  { label: "Seguros", amount: 36000, color: "#a855f7" },
  { label: "Administración", amount: 29000, color: "#f97316" }
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(value);
}

export function Cashbox() {
  const incomesFromCoupons = useMemo(
    () => readCashIncomes().reduce((acc, movement) => acc + movement.amount, 0),
    []
  );

  const totalEgresos = useMemo(() => categories.reduce((acc, category) => acc + category.amount, 0), []);
  const balance = incomesFromCoupons - totalEgresos;

  const chart = useMemo(() => {
    const total = categories.reduce((acc, category) => acc + category.amount, 0);
    let currentDeg = 0;
    const stops = categories.map((category) => {
      const ratio = category.amount / total;
      const start = currentDeg;
      const end = currentDeg + ratio * 360;
      currentDeg = end;
      return `${category.color} ${start}deg ${end}deg`;
    });
    return `conic-gradient(${stops.join(", ")})`;
  }, []);

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>Caja</h1>
          <p>Ingresos reflejados desde Cobro de cupón + egresos.</p>
        </div>
        <span className={`badge ${balance >= 0 ? "badge-positive" : "badge-negative"}`}>
          Balance: {formatCurrency(balance)}
        </span>
      </header>

      <div className="cashbox-grid">
        <div className="card cashbox-chart-card">
          <h3>Distribución de egresos</h3>
          <div className="donut" style={{ background: chart }}>
            <div className="donut-center">
              <small>Egresos</small>
              <strong>{formatCurrency(totalEgresos)}</strong>
            </div>
          </div>
        </div>

        <div className="card cashbox-summary">
          <h3>Movimientos del mes</h3>
          <div className="cashbox-row">
            <span>Ingresos (cupones)</span>
            <strong>{formatCurrency(incomesFromCoupons)}</strong>
          </div>
          <div className="cashbox-row">
            <span>Egresos</span>
            <strong>{formatCurrency(totalEgresos)}</strong>
          </div>
          <div className="cashbox-row total">
            <span>Resultado</span>
            <strong>{formatCurrency(balance)}</strong>
          </div>
        </div>
      </div>

      <div className="card placeholder-table">
        <div className="table-row header table-row-cashbox">
          <span>Categoría</span>
          <span>Participación</span>
          <span>Monto</span>
        </div>
        {categories.map((category) => {
          const percentage = ((category.amount / totalEgresos) * 100).toFixed(1);
          return (
            <div key={category.label} className="table-row table-row-cashbox">
              <span className="cashbox-category">
                <i style={{ backgroundColor: category.color }} />
                {category.label}
              </span>
              <span>{percentage}%</span>
              <span>{formatCurrency(category.amount)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
