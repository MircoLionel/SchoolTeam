import { useMemo, useState } from "react";
import { getPassengerBalance, readStoredPassengers, updatePassengerById } from "../state/passengersStorage";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

export function TripPassengers() {
  const params = new URLSearchParams(window.location.search);
  const tripId = Number(params.get("tripId") ?? "0");
  const [version, setVersion] = useState(0);

  const passengers = useMemo(() => {
    const all = readStoredPassengers();
    return all.filter((item) => item.trip_id === tripId);
  }, [tripId, version]);

  const exportExcel = () => {
    const headers = [
      "Nombre y Apellido", "DNI", "Fecha de Nac", "Precio", "Cantidad Cuotas",
      "Cuota 1", "Cuota 2", "Cuota 3", "Cuota 4", "Cuota 5", "Cuota 6", "Cuota 7", "Cuota 8",
      "Saldo", "Turno"
    ];

    const rows = passengers.map((passenger) => {
      const installments = Array.from(
        { length: passenger.num_installments },
        (_, index) => passenger.installments[index] ?? 0
      );
      const remaining = getPassengerBalance(passenger);
      return [
        `${passenger.passengerName} ${passenger.passengerLastName}`,
        passenger.passengerDni,
        new Date(`${passenger.passengerBirthDate}T00:00:00`).toLocaleDateString("es-AR"),
        passenger.trip_value,
        passenger.num_installments,
        ...installments,
        remaining,
        passenger.shift_name
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pasajeros-salida-${tripId}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const updatePrice = (passengerId: number, value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    updatePassengerById(passengerId, (item) => ({ ...item, trip_value: parsed }));
    setVersion((current) => current + 1);
  };

  return (
    <section className="stack standalone-page">
      <header className="page-header">
        <div>
          <h1>Pasajeros de la salida #{tripId}</h1>
          <p>Podés editar precio por alumno y visualizar cuotas del pasajero.</p>
        </div>
        <button type="button" className="btn" onClick={exportExcel}>Exportar a XLSX</button>
      </header>

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
        </div>

        {passengers.length === 0 ? (
          <div className="table-row trip-passengers-row-extended">
            <span>No hay pasajeros asignados.</span><span>-</span><span>-</span><span>-</span>
            <span>-</span><span>-</span><span>-</span><span>-</span>
          </div>
        ) : null}

        {passengers.map((passenger) => {
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
            </div>
          );
        })}
      </div>
    </section>
  );
}
