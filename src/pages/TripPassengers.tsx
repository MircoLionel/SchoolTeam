import { useMemo, useState } from "react";
import { useAuth } from "../state/AuthContext";
import {
  appendPassengerAudit,
  getPassengerBalance,
  readStoredPassengers,
  saveStoredPassengers,
  updatePassengerById,
} from "../state/passengersStorage";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

const escapeHtml = (value: unknown): string =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export function TripPassengers() {
  const { user } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const tripId = Number(params.get("tripId") ?? "0");
  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedShift, setSelectedShift] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "shift">("name");

  const passengers = useMemo(() => {
    const all = readStoredPassengers();
    return all.filter((item) => item.trip_id === tripId);
  }, [tripId, version]);

  const shiftOptions = useMemo(
    () => Array.from(new Set(passengers.map((passenger) => passenger.shift_name))).sort((a, b) => a.localeCompare(b, "es")),
    [passengers]
  );

  const visiblePassengers = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    const filtered = passengers.filter((passenger) => {
      if (selectedShift !== "all" && passenger.shift_name !== selectedShift) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const fullName = `${passenger.passengerName} ${passenger.passengerLastName}`.toLowerCase();
      return fullName.includes(normalizedQuery);
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "shift") {
        const byShift = a.shift_name.localeCompare(b.shift_name, "es");
        if (byShift !== 0) return byShift;
      }

      const aName = `${a.passengerLastName} ${a.passengerName}`;
      const bName = `${b.passengerLastName} ${b.passengerName}`;
      return aName.localeCompare(bName, "es");
    });
  }, [passengers, search, selectedShift, sortBy]);

  // IMPORTANTE: este export es SOLO CSV (sin bloque HTML/XLS) para evitar errores de parseo en Vite/Babel.
  const exportCsv = () => {
    // Para evitar desfasajes, usamos la cantidad de cuotas del plan de la salida (primer pasajero visible).
    // En esta pantalla todos los pasajeros pertenecen a la misma salida.
    const planInstallments = Number(visiblePassengers[0]?.num_installments ?? 0);
    const headers = [
      "Nombre y Apellido",
      "DNI",
      "Fecha de Nac",
      "Precio",
      "Cantidad Cuotas",
      ...Array.from({ length: planInstallments }, (_, index) => `Cuota ${index + 1}`),
      "Saldo",
      "Turno"
    ];

    const rows = visiblePassengers.map((passenger) => {
      const installments = Array.from(
        { length: planInstallments },
        (_, index) => (index < Number(passenger.num_installments) ? passenger.installments[index] ?? 0 : "")
      );

      const remaining = getPassengerBalance(passenger);
      const cells = [
        `${passenger.passengerName} ${passenger.passengerLastName}`,
        passenger.passengerDni,
        new Date(`${passenger.passengerBirthDate}T00:00:00`).toLocaleDateString("es-AR"),
        passenger.trip_value,
        passenger.num_installments,
        ...installments,
        remaining,
        passenger.shift_name
      ];
      return cells;
    });

      return `<tr>${cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`;
    }).join("");

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 12px; }
      th, td { border: 1px solid #d9d9d9; padding: 7px 10px; white-space: nowrap; }
      thead th { font-weight: 700; background: #f2f2f2; }
    </style>
  </head>
  <body>
    <table>
      <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </body>
</html>`;

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pasajeros-salida-${tripId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const updatePrice = (passengerId: number, value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    const updated = updatePassengerById(passengerId, (item) => ({
      ...item,
      trip_value: parsed,
      last_modified_by: user?.name ?? "Sistema",
      last_modified_at: new Date().toISOString(),
      last_modified_action: "price_update"
    }));
    const updatedPassenger = updated.find((item) => item.id === passengerId);
    if (updatedPassenger) {
      appendPassengerAudit({
        id: Date.now(),
        passengerId,
        passengerLabel: `${updatedPassenger.passengerName} ${updatedPassenger.passengerLastName}`,
        action: "price_update",
        actorName: user?.name ?? "Sistema",
        actorRole: user?.role ?? "UNKNOWN",
        createdAt: new Date().toISOString(),
        detail: `Cambio de precio de viaje a ${currencyFormatter.format(parsed)}`
      });
    }
    setVersion((current) => current + 1);
  };

  const deletePassenger = (passengerId: number) => {
    const target = passengers.find((item) => item.id === passengerId);
    if (!target) return;

    const confirmed = window.confirm(
      `¿Eliminar a ${target.passengerName} ${target.passengerLastName}? Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    const next = readStoredPassengers().filter((item) => item.id !== passengerId);
    saveStoredPassengers(next);

    appendPassengerAudit({
      id: Date.now(),
      passengerId,
      passengerLabel: `${target.passengerName} ${target.passengerLastName}`,
      action: "delete",
      actorName: user?.name ?? "Sistema",
      actorRole: user?.role ?? "UNKNOWN",
      createdAt: new Date().toISOString(),
      detail: "Eliminó pasajero desde vista de salida"
    });

    setVersion((current) => current + 1);
  };

  return (
    <section className="stack standalone-page">
      <header className="page-header">
        <div>
          <h1>Pasajeros de la salida #{tripId}</h1>
          <p>Podés filtrar por nombre/turno, ordenar por turno, editar precio y eliminar pasajero.</p>
        </div>
        <button type="button" className="btn" onClick={exportCsv}>Exportar CSV</button>
      </header>

      <div className="card form-grid">
        <label className="field">
          <span>Buscar por nombre</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ej: Antonela Machuca"
          />
        </label>
        <label className="field">
          <span>Filtrar por turno</span>
          <select value={selectedShift} onChange={(event) => setSelectedShift(event.target.value)}>
            <option value="all">Todos</option>
            {shiftOptions.map((shift) => (
              <option key={shift} value={shift}>{shift}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Ordenar</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as "name" | "shift")}>
            <option value="name">Apellido y nombre</option>
            <option value="shift">Turno y apellido</option>
          </select>
        </label>
      </div>

      <div className="card placeholder-table">
        <div className="table-row header trip-passengers-row-extended">
          <span>Nombre</span>
          <span>Apellido</span>
          <span>DNI</span>
          <span>Fecha de nacimiento</span>
          <span>Precio viaje</span>
          <span>Cuotas</span>
          <span>Estado de cuenta</span>
          <span>Turno</span>
          <span>Acciones</span>
        </div>

        {visiblePassengers.length === 0 ? (
          <div className="table-row trip-passengers-row-extended">
            <span>No hay pasajeros para el filtro seleccionado.</span><span>-</span><span>-</span><span>-</span>
            <span>-</span><span>-</span><span>-</span><span>-</span><span>-</span>
          </div>
        ) : null}

        {visiblePassengers.map((passenger) => {
          const remaining = getPassengerBalance(passenger);
          return (
            <div key={passenger.id} className="table-row trip-passengers-row-extended">
              <span>{passenger.passengerName}</span>
              <span>{passenger.passengerLastName}</span>
              <span>{passenger.passengerDni}</span>
              <span>{new Date(`${passenger.passengerBirthDate}T00:00:00`).toLocaleDateString("es-AR")}</span>
              <span>
                <input type="number" min="1" defaultValue={passenger.trip_value} onBlur={(event) => updatePrice(passenger.id, event.target.value)} />
              </span>
              <span>{passenger.num_installments}</span>
              <span>{currencyFormatter.format(remaining)}</span>
              <span>{passenger.shift_name}</span>
              <span>
                <button type="button" className="btn btn-danger" onClick={() => deletePassenger(passenger.id)}>
                  Eliminar
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
