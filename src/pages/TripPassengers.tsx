import { useMemo } from "react";
import { readStoredPassengers } from "./Passengers";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

export function TripPassengers() {
  const params = new URLSearchParams(window.location.search);
  const tripId = Number(params.get("tripId") ?? "0");

  const passengers = useMemo(() => {
    const all = readStoredPassengers();
    return all.filter((item) => item.trip_id === tripId);
  }, [tripId]);

  return (
    <section className="stack standalone-page">
      <header className="page-header">
        <div>
          <h1>Pasajeros de la salida #{tripId}</h1>
          <p>Listado de chicos asignados al viaje seleccionado.</p>
        </div>
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
