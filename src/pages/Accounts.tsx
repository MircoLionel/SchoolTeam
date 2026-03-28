import { useMemo, useState } from "react";
import { readStoredPassengers } from "../state/passengersStorage";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

export function Accounts() {
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    const passengers = readStoredPassengers();

    return passengers
      .filter((passenger) => {
        const fullName = `${passenger.passengerName} ${passenger.passengerLastName}`.toLowerCase();
        return (
          fullName.includes(normalized) ||
          passenger.passengerName.toLowerCase().includes(normalized) ||
          passenger.passengerLastName.toLowerCase().includes(normalized) ||
          passenger.passengerDni.includes(normalized)
        );
      })
      .map((passenger) => {
        const paidAmount = passenger.installments.reduce((acc, value) => acc + value, 0);
        const paidPct = Math.max(0, Math.min(100, (paidAmount / passenger.trip_value) * 100));
        const redWidth = Math.min(30, paidPct);
        const greenWidth = paidPct > 30 ? paidPct - 30 : 0;
        const grayWidth = Math.max(0, 100 - paidPct);

        return {
          id: passenger.id,
          passenger: `${passenger.passengerName} ${passenger.passengerLastName}`,
          dni: passenger.passengerDni,
          tripValue: passenger.trip_value,
          paidAmount,
          paidPct,
          redWidth,
          greenWidth,
          grayWidth,
          redAmount: Math.min(paidAmount, passenger.trip_value * 0.3),
          greenAmount: Math.max(0, paidAmount - passenger.trip_value * 0.3),
          grayAmount: Math.max(0, passenger.trip_value - paidAmount)
        };
      });
  }, [query]);

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>Estado de cuenta</h1>
          <p>Buscá por nombre, apellido o DNI para consultar un pasajero puntual.</p>
        </div>
      </header>

      <div className="card form-grid">
        <label className="field">
          <span>Buscar pasajero</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ej: Pérez o 40111222"
          />
        </label>
      </div>

      <div className="card account-list">
        {!query.trim() ? <p>Ingresá un nombre, apellido o DNI para ver un estado de cuenta puntual.</p> : null}

        {query.trim() && rows.length === 0 ? <p>No se encontraron pasajeros con ese criterio.</p> : null}

        {rows.map((row) => (
          <article key={row.id} className="account-item">
            <div className="account-head">
              <h3>
                {row.passenger} · DNI {row.dni}
              </h3>
              <span>
                Pagó {currencyFormatter.format(row.paidAmount)} de {currencyFormatter.format(row.tripValue)} ({" "}
                {row.paidPct.toFixed(1)}%)
              </span>
            </div>

            <div className="progress-stack" aria-label={`Estado de cuenta de ${row.passenger}`}>
              <div className="segment red" style={{ width: `${row.redWidth}%` }} />
              <div className="segment green" style={{ width: `${row.greenWidth}%` }} />
              <div className="segment gray" style={{ width: `${row.grayWidth}%` }} />
            </div>

            <div className="legend-grid">
              <span>
                <strong>Rojo:</strong> {currencyFormatter.format(row.redAmount)}
              </span>
              <span>
                <strong>Verde:</strong> {currencyFormatter.format(row.greenAmount)}
              </span>
              <span>
                <strong>Gris:</strong> {currencyFormatter.format(row.grayAmount)}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
