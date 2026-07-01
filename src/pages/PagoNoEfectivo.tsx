import { FormEvent, useEffect, useMemo, useState } from "react";
import { deletePayment, fetchPassengerPayments, fetchSchools, PassengerPaymentRecord, registerNonCashPayment, searchPassengers } from "../services/api";
import { getPassengerBalance, PassengerItem, saveStoredPassengers } from "../state/passengersStorage";
import { useAuth } from "../state/AuthContext";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

interface SchoolFilterItem {
  id: number;
  name: string;
}

function normalizePassengers(records: Awaited<ReturnType<typeof searchPassengers>>): PassengerItem[] {
  return records.map((record) => ({
    id: record.id,
    passengerName: String(record.full_name ?? "").split(/\s+/)[0] ?? "",
    passengerLastName: String(record.full_name ?? "").split(/\s+/).slice(1).join(" "),
    passengerDni: String(record.dni ?? ""),
    passengerBirthDate: "",
    school_id: Number(record.school?.id ?? 0),
    school_name: String(record.school?.name ?? ""),
    trip_id: Number(record.trip?.id ?? 0),
    trip_label: String(record.trip?.group_name ?? record.trip?.destination ?? ""),
    shift_id: 0,
    shift_name: "",
    isAdultCompanion: false,
    hasSpecialPrice: false,
    trip_value: Math.max(0, Number(record.paid_amount ?? 0) - Number(record.balance ?? 0)),
    paid_amount: Number(record.paid_amount ?? 0),
    num_installments: Number(record.num_installments ?? 1),
    installments: [],
    responsible: { name: "", lastName: "", dni: "", birthDate: "", email: "", phone: "", address: "", city: "" },
  }));
}

export function PagoNoEfectivo() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all");
  const [schools, setSchools] = useState<SchoolFilterItem[]>([]);
  const [selectedPassengerId, setSelectedPassengerId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passengers, setPassengers] = useState<PassengerItem[]>([]);
  const [history, setHistory] = useState<PassengerPaymentRecord[]>([]);

  const loadPassengers = async () => {
    if (!token) return;
    const records = normalizePassengers(await searchPassengers(token, {
      q: query.trim() || undefined,
      school_id: selectedSchoolId === "all" ? undefined : Number(selectedSchoolId),
      limit: 30,
    }));
    setPassengers(records);
    saveStoredPassengers(records);
  };

  useEffect(() => {
    if (!token) return;
    Promise.all([loadPassengers(), fetchSchools(token)])
      .then(([, schoolsPayload]) => {
        setSchools((schoolsPayload ?? []).map((school) => ({ id: school.id, name: school.name })));
      })
      .catch(() => {
        setPassengers([]);
        setSchools([]);
      });
  }, [token, query, selectedSchoolId]);

  const filtered = passengers;

  const selectedPassenger = useMemo(
    () => passengers.find((item) => item.id === Number(selectedPassengerId)),
    [passengers, selectedPassengerId]
  );
  const selectedBalance = selectedPassenger ? getPassengerBalance(selectedPassenger) : null;
  const remainingAmount = selectedPassenger ? Math.max(0, selectedPassenger.trip_value - selectedPassenger.paid_amount) : 0;

  useEffect(() => {
    if (!token || !selectedPassengerId) {
      setHistory([]);
      return;
    }
    fetchPassengerPayments(token, Number(selectedPassengerId))
      .then((rows) => setHistory(rows))
      .catch(() => setHistory([]));
  }, [token, selectedPassengerId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || isSubmitting) return;

    setMessage(null);
    setErrorMessage(null);

    const payment = Number(amount);
    const passengerId = Number(selectedPassengerId);
    if (!payment || payment <= 0 || !passengerId) {
      setErrorMessage("Seleccioná un pasajero y un monto válido.");
      return;
    }

    const selected = passengers.find((item) => item.id === passengerId);
    if (!selected) {
      setErrorMessage("No se encontró el pasajero seleccionado.");
      return;
    }

    try {
      setIsSubmitting(true);
      await registerNonCashPayment(token, {
        passenger_id: passengerId,
        trip_id: selected.trip_id > 0 ? selected.trip_id : undefined,
        amount: payment,
        method: "TRANSFER",
        reference: reference.trim() || undefined,
        detail: `Pago no efectivo de ${selected.passengerName} ${selected.passengerLastName}`,
        payment_date: paymentDate,
      });

      await loadPassengers();
      const rows = await fetchPassengerPayments(token, passengerId);
      setHistory(rows);
      setMessage(`Pago no efectivo registrado: ${currencyFormatter.format(payment)} para ${selected.passengerName} ${selected.passengerLastName}.`);
      setAmount("");
      setReference("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo registrar el pago no efectivo.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!token) return;
    if (!window.confirm("¿Eliminar este pago? Esta acción impacta cuenta y caja.")) return;
    try {
      await deletePayment(token, paymentId);
      await loadPassengers();
      if (selectedPassengerId) {
        const rows = await fetchPassengerPayments(token, Number(selectedPassengerId));
        setHistory(rows);
      }
      setMessage("Pago eliminado correctamente.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar el pago.";
      setErrorMessage(message);
    }
  };

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>Pago no efectivo</h1>
          <p>Registrá transferencias/banco para impactar cuenta corriente y caja BANCO.</p>
        </div>
      </header>

      <form className="card form-grid" onSubmit={handleSubmit}>
        <div className="form-row">
          <label className="field">
            <span>Escuela</span>
            <select value={selectedSchoolId} onChange={(event) => setSelectedSchoolId(event.target.value)}>
              <option value="all">Todas</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
            </select>
          </label>
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
          <label className="field">
            <span>Fecha de pago</span>
            <input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required />
          </label>
          <label className="field">
            <span>Referencia (opcional)</span>
            <input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="CBU, comprobante, alias..." />
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn" disabled={isSubmitting}>{isSubmitting ? "Registrando..." : "Registrar pago"}</button>
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

      {selectedPassenger ? (
        <div className="card placeholder-table">
          <div className="table-row header">
            <span>Fecha</span><span>Medio</span><span>Monto</span><span>Usuario</span><span>Escuela / Salida</span><span>Acción</span>
          </div>
          {history.length === 0 ? (
            <div className="table-row"><span>Sin pagos</span><span>-</span><span>-</span><span>-</span><span>-</span><span>-</span></div>
          ) : history.map((item) => (
            <div key={item.id} className="table-row">
              <span>{item.payment_date}</span>
              <span>{item.cash_box === "BANK" ? "Transferencia/Banco" : "Efectivo"}</span>
              <span>{currencyFormatter.format(item.amount)}</span>
              <span>{item.user_name}</span>
              <span>{item.school_name} / {item.trip_name || item.trip_destination || "-"}</span>
              <span><button type="button" className="btn btn-danger" onClick={() => handleDeletePayment(item.id)}>Eliminar</button></span>
            </div>
          ))}
        </div>
      ) : null}

      {message ? <p className="badge badge-positive">{message}</p> : null}
      {errorMessage ? <p className="badge badge-negative">{errorMessage}</p> : null}
    </section>
  );
}
