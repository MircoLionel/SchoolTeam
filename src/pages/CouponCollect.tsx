import { FormEvent, useMemo, useState } from "react";
import {
  appendPassengerAudit,
  appendCashIncome,
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

  const passengers = useMemo(() => readStoredPassengers(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return passengers;
    return passengers.filter((item) => {
      const fullName = `${item.passengerName} ${item.passengerLastName}`.toLowerCase();
      return fullName.includes(q) || item.passengerDni.includes(q);
    });
  }, [passengers, query]);

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

      {message ? <p className="badge">{message}</p> : null}
    </section>
  );
}
