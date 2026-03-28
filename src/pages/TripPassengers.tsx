import { useMemo } from "react";

interface PassengerRecord {
  id: number;
  passengerName: string;
  passengerLastName: string;
  school_id: number;
  trip_id: number;
}

const STORAGE_KEY = "schoolteam.passengers.with-responsible";

function readPassengers(): PassengerRecord[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PassengerRecord[];
  } catch {
    return [];
  }
}

export function TripPassengers() {
  const params = new URLSearchParams(window.location.search);
  const tripId = Number(params.get("tripId") ?? "0");

  const passengers = useMemo(() => {
    const all = readPassengers();
    return all.filter((item) => item.trip_id === tripId);
  }, [tripId]);

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>Pasajeros por salida</h1>
          <p>Salida #{tripId}</p>
        </div>
      </header>

      <div className="card placeholder-table">
        <div className="table-row header">
          <span>Pasajero</span>
          <span>Salida</span>
          <span>Estado</span>
        </div>

        {passengers.length === 0 ? (
          <div className="table-row">
            <span>No hay pasajeros asignados.</span>
            <span>{tripId || "-"}</span>
            <span>-</span>
          </div>
        ) : null}

        {passengers.map((passenger) => (
          <div key={passenger.id} className="table-row">
            <span>
              {passenger.passengerName} {passenger.passengerLastName}
            </span>
            <span>{passenger.trip_id}</span>
            <span>Asignado</span>
          </div>
        ))}
      </div>
    </section>
  );
}
