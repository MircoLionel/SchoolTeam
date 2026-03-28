import { FormEvent, useMemo, useState } from "react";

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
  responsible: Responsible;
}

const STORAGE_KEY = "schoolteam.passengers.with-responsible";

const initialData: PassengerItem[] = [
  {
    id: 1,
    passengerName: "Lucía",
    passengerLastName: "Pérez",
    responsible: {
      name: "Carla",
      lastName: "Pérez",
      dni: "27111222",
      birthDate: "1986-04-21",
      email: "carla.perez@email.com",
      phone: "1134567890",
      address: "San Martín 1234",
      city: "La Plata"
    }
  }
];

function readStoredItems(): PassengerItem[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return initialData;
  try {
    return JSON.parse(raw) as PassengerItem[];
  } catch {
    return initialData;
  }
}

export function Passengers() {
  const [items, setItems] = useState<PassengerItem[]>(readStoredItems);
  const [form, setForm] = useState({
    passengerName: "",
    passengerLastName: "",
    responsibleName: "",
    responsibleLastName: "",
    dni: "",
    birthDate: "",
    email: "",
    phone: "",
    address: "",
    city: ""
  });

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

    const nextItem: PassengerItem = {
      id: Date.now(),
      passengerName: form.passengerName.trim(),
      passengerLastName: form.passengerLastName.trim(),
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
          <p>Cada pasajero incluye su responsable como tipo de dato obligatorio.</p>
        </div>
        <span className="badge">{items.length} pasajeros</span>
      </header>

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
          <span>Responsable</span>
          <span>Contacto</span>
          <span>Domicilio</span>
          <span>Acción</span>
        </div>
        {items.map((item) => (
          <div key={item.id} className="table-row passengers-table-row">
            <span>
              {item.passengerName} {item.passengerLastName}
            </span>
            <span>
              {item.responsible.name} {item.responsible.lastName} · DNI {item.responsible.dni}
            </span>
            <span>
              {item.responsible.email} · {item.responsible.phone}
            </span>
            <span>
              {item.responsible.address}, {item.responsible.city}
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
