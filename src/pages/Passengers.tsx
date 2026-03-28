import { FormEvent, useEffect, useMemo, useState } from "react";
import { fetchSchools, fetchTrips } from "../services/api";
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

interface PassengerItem {
  id: number;
  passengerName: string;
  passengerLastName: string;
  school_id: number;
  school_name: string;
  trip_id: number;
  trip_label: string;
  responsible: Responsible;
}

interface SchoolItem {
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

const STORAGE_KEY = "schoolteam.passengers.with-responsible";

function readStoredItems(): PassengerItem[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PassengerItem[];
  } catch {
    return [];
  }
}

export function Passengers() {
  const { token } = useAuth();
  const [items, setItems] = useState<PassengerItem[]>(readStoredItems);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    passengerName: "",
    passengerLastName: "",
    school_id: "",
    trip_id: "",
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
        const [schoolsResponse, tripsResponse] = await Promise.all([fetchSchools(token), fetchTrips(token)]);

        if (!isMounted) return;
        setSchools(Array.isArray(schoolsResponse) ? schoolsResponse : []);
        setTrips(Array.isArray(tripsResponse) ? tripsResponse : []);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "No se pudieron cargar escuelas y salidas.");
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
      Number(form.dni) > 0 &&
      form.email.includes("@") &&
      Number(form.phone) > 0,
    [form]
  );

  const persist = (next: PassengerItem[]) => {
    setItems(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormReady) return;

    const school = schools.find((item) => item.id === Number(form.school_id));
    const trip = trips.find((item) => item.id === Number(form.trip_id));
    if (!school || !trip) return;

    const tripLabel = trip.grade?.name ?? trip.group_name ?? String(trip.year);

    const nextItem: PassengerItem = {
      id: Date.now(),
      passengerName: form.passengerName.trim(),
      passengerLastName: form.passengerLastName.trim(),
      school_id: school.id,
      school_name: school.name,
      trip_id: trip.id,
      trip_label: tripLabel,
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
      school_id: "",
      trip_id: "",
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
          <p>Asigná cada pasajero a una escuela y a una salida creada previamente.</p>
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
            <span>Escuela</span>
            <select
              value={form.school_id}
              onChange={(event) => setForm((current) => ({ ...current, school_id: event.target.value, trip_id: "" }))}
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
            <span>DNI</span>
            <input
              value={form.dni}
              onChange={(event) => setForm((current) => ({ ...current, dni: event.target.value }))}
              required
            />
          </label>
        </div>

        <div className="form-row">
          <label className="field">
            <span>Fecha de nacimiento</span>
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
          <span>Responsable</span>
          <span>Contacto</span>
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
            <span>
              {item.responsible.name} {item.responsible.lastName} · DNI {item.responsible.dni}
            </span>
            <span>
              {item.responsible.email} · {item.responsible.phone}
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
