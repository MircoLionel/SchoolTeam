import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { renderCheckbookPdf } from "../services/api";
import { useAuth } from "../state/AuthContext";
import { getPassengerBalance, readStoredPassengers } from "../state/passengersStorage";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

export function Accounts() {
  const navigate = useNavigate();
  const { token } = useAuth();
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
        const overpaidAmount = Math.max(0, paidAmount - passenger.trip_value);
        const baseTripValue = Math.max(1, passenger.trip_value);
        const paidPct = Math.max(0, Math.min(100, (paidAmount / baseTripValue) * 100));
        const barTotal = overpaidAmount > 0 ? baseTripValue + overpaidAmount : baseTripValue;
        const rawGreenWidth = overpaidAmount > 0 ? (overpaidAmount / barTotal) * 100 : 0;
        const greenWidth = overpaidAmount > 0 ? Math.max(rawGreenWidth, 8) : 0;
        const redWidth = overpaidAmount > 0
          ? Math.max(0, 100 - greenWidth)
          : Math.min(100, paidPct);
        const grayWidth = overpaidAmount > 0 ? 0 : Math.max(0, 100 - paidPct);
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
          overpaidAmount,
          remainingAmount: Math.max(0, passenger.trip_value - paidAmount),
          installments: passenger.installments,
          tripLabel: passenger.trip_label,
          schoolName: passenger.school_name
        };
      });
  }, [passengers, query, selectedSchool, selectedTrip]);

  const printCheckbook = async (row: (typeof rows)[number]) => {
    if (!token) {
      window.alert("No hay sesión activa para generar la chequera.");
      return;
    }

    try {
      const payload = {
        code: `PAX-${row.id}`,
        header: {
          contrato: String(row.id),
          grupo: row.schoolName,
          destino: row.tripLabel,
          padre_tutor: row.passenger,
          pax: row.passenger,
          dni: row.dni,
          periodo: new Date().getFullYear().toString()
        },
        installments: row.installments.map((value, index) => ({
          nro_cuota: String(index + 1),
          importe: Number(value ?? 0)
        }))
      };

      const pdfBlob = await renderCheckbookPdf(token, payload);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const popup = window.open(pdfUrl, "_blank");
      if (!popup) {
        window.alert("El navegador bloqueó la ventana de impresión.");
        URL.revokeObjectURL(pdfUrl);
        return;
      }

      popup.addEventListener("load", () => {
        popup.focus();
        popup.print();
      });

      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo generar la chequera.";
      window.alert(message);
    }
  };

  const editPassenger = (id: number) => {
    navigate(`/passengers?editPassengerId=${id}`);
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
              {row.greenWidth > 0 ? <div className="segment green" style={{ width: `${row.greenWidth}%`, backgroundColor: "#12b76a" }} /> : null}
              {row.grayWidth > 0 ? <div className="segment gray" style={{ width: `${row.grayWidth}%` }} /> : null}
            </div>

            <div className="legend-grid">
              <span>
                <strong>Cobrado:</strong> {currencyFormatter.format(row.paidAmount)}
              </span>
              <span>
                <strong>Resta cobrar:</strong> {currencyFormatter.format(row.remainingAmount)}
              </span>
              {row.overpaidAmount > 0 ? (
                <span>
                  <strong>Pago excedido:</strong> {currencyFormatter.format(row.overpaidAmount)}
                </span>
              ) : null}
              <div className="account-actions">
                <button type="button" className="btn" onClick={() => printCheckbook(row)}>Imprimir chequera</button>
                <button type="button" className="btn" onClick={() => editPassenger(row.id)}>Editar pasajero</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
