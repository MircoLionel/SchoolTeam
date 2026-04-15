import { FormEvent, useMemo, useState } from "react";
import {
  appendPassengerAudit,
  appendCashIncome,
  getPassengerBalance,
  readStoredPassengers,
  saveStoredPassengers
} from "../state/passengersStorage";
import { useAuth } from "../state/AuthContext";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

export function CouponCollect() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [selectedPassengerId, setSelectedPassengerId] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const [passengers, setPassengers] = useState(() => readStoredPassengers());

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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payment = Number(amount);
    const passengerId = Number(selectedPassengerId);
    if (!payment || payment <= 0 || !passengerId) return;

    const current = readStoredPassengers();
    const selected = current.find((item) => item.id === passengerId);
    if (!selected) return;

    const nextPaid = Math.min(selected.trip_value, selected.paid_amount + payment);

    const nextPassengers = current.map((item) =>
      item.id === passengerId
        ? {
            ...item,
            paid_amount: Math.min(nextPaid, item.trip_value),
            last_modified_by: user?.name ?? "Sistema",
            last_modified_at: new Date().toISOString(),
            last_modified_action: "payment" as const
          }
        : item
    );

    saveStoredPassengers(nextPassengers);
    setPassengers(nextPassengers);

    appendCashIncome({
      id: Date.now(),
      passengerId,
      passengerLabel: `${selected.passengerName} ${selected.passengerLastName}`,
      amount: payment,
      createdAt: new Date().toISOString(),
      method: "coupon"
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
