import { useMemo } from "react";
import { readStoredPassengers } from "./Passengers";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

function splitIntoInstallments(paidAmount: number, count: number) {
  if (count <= 0) return [];
  const perInstallment = paidAmount > 0 ? Math.floor(paidAmount / count) : 0;
  return Array.from({ length: count }, (_, index) =>
    index === count - 1 ? paidAmount - perInstallment * (count - 1) : perInstallment
  );
}

export function TripPassengers() {
  const params = new URLSearchParams(window.location.search);
  const tripId = Number(params.get("tripId") ?? "0");

  const passengers = useMemo(() => {
    const all = readStoredPassengers();
    return all.filter((item) => item.trip_id === tripId);
  }, [tripId]);

  const exportExcel = () => {
    const headers = [
      "Nombre y Apellido",
      "DNI",
      "Fecha de Nac",
      "Precio",
      "Cuota 1",
      "Cuota 2",
      "Cuota 3",
      "Cuota 4",
      "Cuota 5",
      "Cuota 6",
      "Cuota 7",
      "Cuota 8",
      "Saldo",
      "Turno"
    ];

    const rows = passengers.map((passenger) => {
      const installments = splitIntoInstallments(passenger.paid_amount, 8);
      const remaining = Math.max(0, passenger.trip_value - passenger.paid_amount);
      return [
        `${passenger.passengerName} ${passenger.passengerLastName}`,
        passenger.passengerDni,
        new Date(`${passenger.passengerBirthDate}T00:00:00`).toLocaleDateString("es-AR"),
        passenger.trip_value,
        ...installments,
        remaining,
        passenger.shift_name
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pasajeros-salida-${tripId}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="stack standalone-page">
      <header className="page-header">
        <div>
          <h1>Pasajeros de la salida #{tripId}</h1>
          <p>Listado de chicos asignados al viaje seleccionado.</p>
        </div>
        <button type="button" className="btn" onClick={exportExcel}>
          Exportar a Excel
        </button>
      </header>

      <div className="card placeholder-table">
        <div className="table-row header trip-passengers-row">
          <span>Nombre</span>
          <span>Apellido</span>
          <span>DNI</span>
          <span>Fecha de nacimiento</span>
          <span>Estado de cuenta (restante)</span>
          <span>Turno</span>
        </div>

        {passengers.length === 0 ? (
          <div className="table-row trip-passengers-row">
            <span>No hay pasajeros asignados.</span>
            <span>-</span>
            <span>-</span>
            <span>-</span>
            <span>-</span>
            <span>-</span>
          </div>
        ) : null}

        {passengers.map((passenger) => {
          const remaining = Math.max(0, passenger.trip_value - passenger.paid_amount);
          return (
            <div key={passenger.id} className="table-row trip-passengers-row">
              <span>{passenger.passengerName}</span>
              <span>{passenger.passengerLastName}</span>
              <span>{passenger.passengerDni}</span>
              <span>{new Date(`${passenger.passengerBirthDate}T00:00:00`).toLocaleDateString("es-AR")}</span>
              <span>{currencyFormatter.format(remaining)}</span>
              <span>{passenger.shift_name}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
