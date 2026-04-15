import { useMemo, useState } from "react";
import { getPassengerBalance, readStoredPassengers } from "../state/passengersStorage";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

export function Accounts() {
  const [query, setQuery] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [selectedTrip, setSelectedTrip] = useState("");

  const passengers = useMemo(() => readStoredPassengers(), []);

  const schoolTabs = useMemo(() => {
    const schools = Array.from(new Set(passengers.map((passenger) => passenger.school_name))).sort((a, b) =>
      a.localeCompare(b, "es")
    );
    return ["all", ...schools];
  }, [passengers]);

  const tripOptions = useMemo(() => {
    const scoped = selectedSchool === "all"
      ? passengers
      : passengers.filter((passenger) => passenger.school_name === selectedSchool);

    const unique = new Map<number, string>();
    scoped.forEach((passenger) => {
      if (!unique.has(passenger.trip_id)) {
        unique.set(passenger.trip_id, passenger.trip_label);
      }
    });

    return Array.from(unique.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [passengers, selectedSchool]);

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const hasQuery = normalized.length > 0;

    return passengers
      .filter((passenger) => {
        const isSchoolMatch = selectedSchool === "all" || passenger.school_name === selectedSchool;
        if (!isSchoolMatch) return false;
        if (!hasQuery && (!selectedTrip || passenger.trip_id !== Number(selectedTrip))) return false;
        if (!normalized) return selectedTrip ? passenger.trip_id === Number(selectedTrip) : true;
        const fullName = `${passenger.passengerName} ${passenger.passengerLastName}`.toLowerCase();
        return (
          fullName.includes(normalized) ||
          passenger.passengerName.toLowerCase().includes(normalized) ||
          passenger.passengerLastName.toLowerCase().includes(normalized) ||
          passenger.passengerDni.includes(normalized)
        );
      })
      .map((passenger) => {
        const paidAmount = passenger.paid_amount;
        const paidPct = Math.max(0, Math.min(100, (paidAmount / passenger.trip_value) * 100));
        const redWidth = Math.min(100, paidPct);
        const grayWidth = Math.max(0, 100 - paidPct);
        const balance = getPassengerBalance(passenger);

        return {
          id: passenger.id,
          passenger: `${passenger.passengerName} ${passenger.passengerLastName}`,
          dni: passenger.passengerDni,
          tripValue: passenger.trip_value,
          paidAmount,
          paidPct,
          redWidth,
          grayWidth,
          balance,
          remainingAmount: Math.max(0, passenger.trip_value - paidAmount),
          installments: passenger.installments,
          tripLabel: passenger.trip_label,
          schoolName: passenger.school_name
        };
      });
  }, [passengers, query, selectedSchool, selectedTrip]);

  const printCheckbook = (row: (typeof rows)[number]) => {
    const quotaLines = row.installments
      .map((value, index) => `Cuota ${index + 1}: ${currencyFormatter.format(value)}`)
      .join("\n");

    const printable = [
      "Chequera del pasajero",
      `${row.passenger} · DNI ${row.dni}`,
      `Escuela: ${row.schoolName}`,
      `Salida: ${row.tripLabel}`,
      `Precio del viaje: ${currencyFormatter.format(row.tripValue)}`,
      "",
      quotaLines
    ].join("\n");

    const popup = window.open("", "_blank", "width=700,height=900");
    if (!popup) return;
    popup.document.write(`<pre style="font-family: sans-serif; padding: 24px; white-space: pre-wrap;">${printable}</pre>`);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>Estado de cuenta</h1>
          <p>Buscá por nombre, apellido o DNI para consultar un pasajero puntual.</p>
        </div>
      </header>

      <div className="card form-grid">
        <div className="school-tabs">
          {schoolTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`tab-btn ${selectedSchool === tab ? "active" : ""}`}
              onClick={() => {
                setSelectedSchool(tab);
                setSelectedTrip("");
              }}
            >
              {tab === "all" ? "Todas las escuelas" : tab}
            </button>
          ))}
        </div>
        <label className="field">
          <span>Salida (viaje)</span>
          <select value={selectedTrip} onChange={(event) => setSelectedTrip(event.target.value)} required>
            <option value="">Seleccionar salida</option>
            {tripOptions.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {trip.label}
              </option>
            ))}
          </select>
        </label>
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
        {!selectedTrip && !query.trim() ? <p>Seleccioná una salida para ver estado de cuenta e imprimir chequeras.</p> : null}
        {(selectedTrip || query.trim()) && rows.length === 0 ? <p>No hay pasajeros para el filtro seleccionado.</p> : null}

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
              <span>
                Estado de cuenta: <strong>{currencyFormatter.format(row.balance)}</strong>
              </span>
            </div>

            <div className="progress-stack" aria-label={`Estado de cuenta de ${row.passenger}`}>
              <div className="segment red" style={{ width: `${row.redWidth}%` }} />
              <div className="segment gray" style={{ width: `${row.grayWidth}%` }} />
            </div>

            <div className="legend-grid">
              <span>
                <strong>Cobrado:</strong> {currencyFormatter.format(row.paidAmount)}
              </span>
              <span>
                <strong>Resta cobrar:</strong> {currencyFormatter.format(row.remainingAmount)}
              </span>
              <button type="button" className="btn" onClick={() => printCheckbook(row)}>Imprimir chequera</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
