import { FormEvent, useEffect, useMemo, useState } from "react";
import { fetchSchools, fetchShifts, fetchTrips } from "../services/api";
import { useAuth } from "../state/AuthContext";

interface Responsible {
  name: string;
  lastName: string;
  dni: string;
  birthDate: string;
  email: string;
  phone: string;
  address: string;
  city: string;
}

export interface PassengerItem {
  id: number;
  passengerName: string;
  passengerLastName: string;
  passengerDni: string;
  passengerBirthDate: string;
  school_id: number;
  school_name: string;
  trip_id: number;
  trip_label: string;
  shift_id: number;
  shift_name: string;
  trip_value: number;
  paid_amount: number;
  responsible: Responsible;
}

interface SchoolItem {
  id: number;
  name: string;
}

interface ShiftItem {
  id: number;
  name: string;
}

interface TripItem {
  id: number;
  group_name: string;
  year: number;
  school_id?: number;
  school?: { id: number; name: string } | null;
  grade?: { id: number; name: string } | null;
}

export const PASSENGERS_STORAGE_KEY = "schoolteam.passengers.with-responsible";

export function readStoredPassengers(): PassengerItem[] {
  const raw = localStorage.getItem(PASSENGERS_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PassengerItem[];
  } catch {
    return [];
  }
}

export function Passengers() {
  const { token } = useAuth();
  const [items, setItems] = useState<PassengerItem[]>(readStoredPassengers);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    passengerName: "",
    passengerLastName: "",
    passengerDni: "",
    passengerBirthDate: "",
    school_id: "",
    trip_id: "",
    shift_id: "",
    responsibleName: "",
    responsibleLastName: "",
    dni: "",
    birthDate: "",
    email: "",
    phone: "",
    address: "",
    city: ""
  });

  useEffect(() => {
    let isMounted = true;

    const loadOptions = async () => {
      if (!token) return;

      try {
        const [schoolsResponse, tripsResponse, shiftsResponse] = await Promise.all([
          fetchSchools(token),
          fetchTrips(token),
          fetchShifts(token)
        ]);

        if (!isMounted) return;
        setSchools(Array.isArray(schoolsResponse) ? schoolsResponse : []);
        setTrips(Array.isArray(tripsResponse) ? tripsResponse : []);
        setShifts(Array.isArray(shiftsResponse) ? shiftsResponse : []);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "No se pudieron cargar escuelas/salidas/turnos.");
      }
    };

    loadOptions();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const filteredTrips = useMemo(() => {
    if (!form.school_id) return [];
    const schoolId = Number(form.school_id);
    return trips.filter((trip) => (trip.school_id ?? trip.school?.id) === schoolId);
  }, [form.school_id, trips]);

  const isFormReady = useMemo(
    () =>
      Object.values(form).every((value) => value.trim()) &&
      Number(form.passengerDni) > 0 &&
      Number(form.dni) > 0 &&
      form.email.includes("@") &&
      Number(form.phone) > 0,
    [form]
  );

  const persist = (next: PassengerItem[]) => {
    setItems(next);
    localStorage.setItem(PASSENGERS_STORAGE_KEY, JSON.stringify(next));
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormReady) return;

    const school = schools.find((item) => item.id === Number(form.school_id));
    const trip = trips.find((item) => item.id === Number(form.trip_id));
    const shift = shifts.find((item) => item.id === Number(form.shift_id));
    if (!school || !trip || !shift) return;

    const tripLabel = trip.grade?.name ?? trip.group_name ?? String(trip.year);

    const nextItem: PassengerItem = {
      id: Date.now(),
      passengerName: form.passengerName.trim(),
      passengerLastName: form.passengerLastName.trim(),
      passengerDni: form.passengerDni.trim(),
      passengerBirthDate: form.passengerBirthDate,
      school_id: school.id,
      school_name: school.name,
      trip_id: trip.id,
      trip_label: tripLabel,
      shift_id: shift.id,
      shift_name: shift.name,
      trip_value: 820000,
      paid_amount: 0,
      responsible: {
        name: form.responsibleName.trim(),
        lastName: form.responsibleLastName.trim(),
        dni: form.dni.trim(),
        birthDate: form.birthDate,
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim()
      }
    };

    persist([nextItem, ...items]);

    setForm({
      passengerName: "",
      passengerLastName: "",
      passengerDni: "",
      passengerBirthDate: "",
      school_id: "",
      trip_id: "",
      shift_id: "",
      responsibleName: "",
      responsibleLastName: "",
      dni: "",
      birthDate: "",
      email: "",
      phone: "",
      address: "",
      city: ""
    });
  };

  const removeItem = (id: number) => {
    persist(items.filter((item) => item.id !== id));
  };

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>Pasajeros</h1>
          <p>Asigná cada pasajero a escuela, salida y turno.</p>
        </div>
        <span className="badge">{items.length} pasajeros</span>
      </header>

      {error ? <p className="form-error">{error}</p> : null}

      <form className="card form-grid" onSubmit={onSubmit}>
        <div className="form-row">
          <label className="field">
            <span>Nombre pasajero</span>
            <input
              value={form.passengerName}
              onChange={(event) => setForm((current) => ({ ...current, passengerName: event.target.value }))}
              required
            />
          </label>
          <label className="field">
            <span>Apellido pasajero</span>
            <input
              value={form.passengerLastName}
              onChange={(event) => setForm((current) => ({ ...current, passengerLastName: event.target.value }))}
              required
            />
          </label>
          <label className="field">
            <span>DNI pasajero</span>
            <input
              value={form.passengerDni}
              onChange={(event) => setForm((current) => ({ ...current, passengerDni: event.target.value }))}
              required
            />
          </label>
          <label className="field">
            <span>Fecha nacimiento pasajero</span>
            <input
              type="date"
              value={form.passengerBirthDate}
              onChange={(event) => setForm((current) => ({ ...current, passengerBirthDate: event.target.value }))}
              required
            />
          </label>
        </div>

        <div className="form-row">
          <label className="field">
            <span>Escuela</span>
            <select
              value={form.school_id}
              onChange={(event) =>
                setForm((current) => ({ ...current, school_id: event.target.value, trip_id: "" }))
              }
              required
            >
              <option value="">Seleccionar</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Salida</span>
            <select
              value={form.trip_id}
              onChange={(event) => setForm((current) => ({ ...current, trip_id: event.target.value }))}
              required
              disabled={!form.school_id}
            >
              <option value="">Seleccionar</option>
              {filteredTrips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.grade?.name ?? trip.group_name ?? trip.year}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Turno</span>
            <select
              value={form.shift_id}
              onChange={(event) => setForm((current) => ({ ...current, shift_id: event.target.value }))}
              required
            >
              <option value="">Seleccionar</option>
              {shifts.map((shift) => (
                <option key={shift.id} value={shift.id}>
                  {shift.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-row">
          <label className="field">
            <span>Nombre responsable</span>
            <input
              value={form.responsibleName}
              onChange={(event) => setForm((current) => ({ ...current, responsibleName: event.target.value }))}
              required
            />
          </label>
          <label className="field">
            <span>Apellido responsable</span>
            <input
              value={form.responsibleLastName}
              onChange={(event) => setForm((current) => ({ ...current, responsibleLastName: event.target.value }))}
              required
            />
          </label>
          <label className="field">
            <span>DNI responsable</span>
            <input
              value={form.dni}
              onChange={(event) => setForm((current) => ({ ...current, dni: event.target.value }))}
              required
            />
          </label>
        </div>

        <div className="form-row">
          <label className="field">
            <span>Fecha nac. responsable</span>
            <input
              type="date"
              value={form.birthDate}
              onChange={(event) => setForm((current) => ({ ...current, birthDate: event.target.value }))}
              required
            />
          </label>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </label>
          <label className="field">
            <span>Teléfono</span>
            <input
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              required
            />
          </label>
        </div>

        <div className="form-row">
          <label className="field">
            <span>Dirección</span>
            <input
              value={form.address}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              required
            />
          </label>
          <label className="field">
            <span>Ciudad</span>
            <input
              value={form.city}
              onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
              required
            />
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn" disabled={!isFormReady}>
            Guardar pasajero
          </button>
        </div>
      </form>

      <div className="card placeholder-table">
        <div className="table-row header passengers-table-row">
          <span>Pasajero</span>
          <span>Escuela / Salida</span>
          <span>Turno</span>
          <span>DNI / Fecha nac.</span>
          <span>Acción</span>
        </div>
        {items.map((item) => (
          <div key={item.id} className="table-row passengers-table-row">
            <span>
              {item.passengerName} {item.passengerLastName}
            </span>
            <span>
              {item.school_name} · {item.trip_label}
            </span>
            <span>{item.shift_name}</span>
            <span>
              {item.passengerDni} · {new Date(`${item.passengerBirthDate}T00:00:00`).toLocaleDateString("es-AR")}
            </span>
            <span>
              <button type="button" className="link" onClick={() => removeItem(item.id)}>
                Eliminar
              </button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
