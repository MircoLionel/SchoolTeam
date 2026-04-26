import { FormEvent, useEffect, useMemo, useState } from "react";
import { extractCollection, fetchPassengers, registerCouponCollectPayment } from "../services/api";
import {
  appendPassengerAudit,
  getPassengerBalance,
  PassengerItem,
  saveStoredPassengers
} from "../state/passengersStorage";
import { useAuth } from "../state/AuthContext";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

function normalizePassengers(payload: unknown): PassengerItem[] {
  const records = extractCollection<Record<string, unknown>>(payload);
  return records.map((record, index) => ({
    id: Number(record.id ?? Date.now() + index),
    passengerName: String(record.passenger_name ?? (String(record.full_name ?? "").split(/\s+/)[0] ?? "")),
    passengerLastName: String(record.passenger_last_name ?? String(record.full_name ?? "").split(/\s+/).slice(1).join(" ")),
    passengerDni: String(record.passenger_dni ?? record.dni ?? ""),
    passengerBirthDate: String(record.passenger_birth_date ?? record.birthdate ?? ""),
    school_id: Number(record.school_id ?? 0),
    school_name: String((record.school as Record<string, unknown> | undefined)?.name ?? ""),
    trip_id: Number(record.trip_id ?? 0),
    trip_label: String((record.trip as Record<string, unknown> | undefined)?.group_name ?? ""),
    shift_id: Number(record.shift_id ?? 0),
    shift_name: String((record.shift as Record<string, unknown> | undefined)?.name ?? ""),
    isAdultCompanion: false,
    hasSpecialPrice: false,
    trip_value: Number(record.trip_value ?? 0),
    paid_amount: Number(record.paid_amount ?? 0),
    num_installments: Number(record.num_installments ?? 1),
    installments: Array.isArray(record.installments) ? (record.installments as number[]) : [],
    responsible: { name: "", lastName: "", dni: "", birthDate: "", email: "", phone: "", address: "", city: "" },
  }));
}

export function CouponCollect() {
  const { user, token } = useAuth();
  const [query, setQuery] = useState("");
  const [selectedPassengerId, setSelectedPassengerId] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [passengers, setPassengers] = useState<PassengerItem[]>([]);

  const loadPassengers = async () => {
    if (!token) return;
    const payload = await fetchPassengers(token);
    const records = normalizePassengers(payload);
    setPassengers(records);
    saveStoredPassengers(records);
  };

  useEffect(() => {
    loadPassengers().catch(() => setPassengers([]));
  }, [token]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return passengers;
    return passengers.filter((item) => {
      const fullName = `${item.passengerName} ${item.passengerLastName}`.toLowerCase();
      return fullName.includes(q) || item.passengerDni.includes(q);
    });
  }, [passengers, query]);

  const selectedPassenger = useMemo(
    () => passengers.find((item) => item.id === Number(selectedPassengerId)),
    [passengers, selectedPassengerId]
  );
  const selectedBalance = selectedPassenger ? getPassengerBalance(selectedPassenger) : null;
  const remainingAmount = selectedPassenger ? Math.max(0, selectedPassenger.trip_value - selectedPassenger.paid_amount) : 0;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    const payment = Number(amount);
    const passengerId = Number(selectedPassengerId);
    if (!payment || payment <= 0 || !passengerId) return;

    const selected = passengers.find((item) => item.id === passengerId);
    if (!selected) return;

    await registerCouponCollectPayment(token, {
      passenger_id: passengerId,
      trip_id: selected.trip_id,
      amount: payment,
      detail: `Cobro de cupón de ${selected.passengerName} ${selected.passengerLastName}`
    });

    appendPassengerAudit({
      id: Date.now() + 1,
      passengerId,
      passengerLabel: `${selected.passengerName} ${selected.passengerLastName}`,
      action: "payment",
      actorName: user?.name ?? "Sistema",
      actorRole: user?.role ?? "UNKNOWN",
      createdAt: new Date().toISOString(),
      detail: `Cobro de cupón por ${currencyFormatter.format(payment)}`
    });

    await loadPassengers();

    setMessage(`Cobro registrado: ${currencyFormatter.format(payment)} para ${selected.passengerName} ${selected.passengerLastName}.`);
    setAmount("");
  };

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>Cobro de cupón</h1>
          <p>Filtrá por pasajero y registrá el pago para impactar en cuenta y caja.</p>
        </div>
      </header>

      <form className="card form-grid" onSubmit={handleSubmit}>
        <div className="form-row">
          <label className="field">
            <span>Buscar pasajero</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre, apellido o DNI" />
          </label>
          <label className="field">
            <span>Pasajero</span>
            <select value={selectedPassengerId} onChange={(event) => setSelectedPassengerId(event.target.value)} required>
              <option value="">Seleccionar</option>
              {filtered.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.passengerName} {item.passengerLastName} · DNI {item.passengerDni}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Monto a cobrar</span>
            <input type="number" min="1" value={amount} onChange={(event) => setAmount(event.target.value)} required />
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn">Registrar cobro</button>
        </div>
      </form>

      {selectedPassenger ? (
        <div className="card">
          <h3>Estado de cuenta del pasajero</h3>
          <p><strong>Pasajero:</strong> {selectedPassenger.passengerName} {selectedPassenger.passengerLastName} · DNI {selectedPassenger.passengerDni}</p>
          <p><strong>Salida:</strong> {selectedPassenger.trip_label} · <strong>Escuela:</strong> {selectedPassenger.school_name}</p>
          <p><strong>Total viaje:</strong> {currencyFormatter.format(selectedPassenger.trip_value)}</p>
          <p><strong>Total cobrado:</strong> {currencyFormatter.format(selectedPassenger.paid_amount)}</p>
          <p><strong>Resta pagar:</strong> {currencyFormatter.format(remainingAmount)}</p>
          <p>
            <strong>Estado:</strong>{" "}
            {selectedBalance !== null && selectedBalance < 0
              ? `Deuda ${currencyFormatter.format(selectedBalance)}`
              : selectedBalance === 0
                ? "Saldo al día"
                : `Saldo a favor ${currencyFormatter.format(selectedBalance)}`}
          </p>
        </div>
      ) : null}

      {message ? <p className="badge">{message}</p> : null}
    </section>
  );
}
