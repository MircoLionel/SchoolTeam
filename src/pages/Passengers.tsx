import { FormEvent, useEffect, useMemo, useState } from "react";
import { fetchSchools, fetchShifts, fetchTrips } from "../services/api";
import { useAuth } from "../state/AuthContext";
import { PassengerItem, readStoredPassengers, saveStoredPassengers } from "../state/passengersStorage";
import { readTripPriceSettings } from "./Trips";

interface SchoolItem { id: number; name: string }
interface ShiftItem { id: number; name: string }
interface TripItem {
  id: number;
  group_name: string;
  year: number;
  school_id?: number;
  school?: { id: number; name: string } | null;
  grade?: { id: number; name: string } | null;
}

const initialForm = {
  passengerName: "",
  passengerLastName: "",
  passengerDni: "",
  passengerBirthDate: "",
  school_id: "",
  trip_id: "",
  shift_id: "",
  isAdultCompanion: false,
  hasSpecialPrice: false,
  specialPrice: "",
  numInstallments: "8",
  responsibleName: "",
  responsibleLastName: "",
  dni: "",
  birthDate: "",
  email: "",
  phone: "",
  address: "",
  city: ""
};

function distributeInstallments(total: number, count: number) {
  const safeCount = Math.max(1, count);
  const base = Math.floor(total / safeCount);
  return Array.from({ length: safeCount }, (_, index) =>
    index === safeCount - 1 ? total - base * (safeCount - 1) : base
  );
}

export function Passengers() {
  const { token } = useAuth();
  const [items, setItems] = useState<PassengerItem[]>(readStoredPassengers);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [installments, setInstallments] = useState<number[]>(Array.from({ length: 8 }, () => 0));

  useEffect(() => {
    let isMounted = true;
    const loadOptions = async () => {
      if (!token) return;
      try {
        const [schoolsResponse, tripsResponse, shiftsResponse] = await Promise.all([
          fetchSchools(token), fetchTrips(token), fetchShifts(token)
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
    return () => { isMounted = false; };
  }, [token]);

  const filteredTrips = useMemo(() => {
    if (!form.school_id) return [];
    const schoolId = Number(form.school_id);
    return trips.filter((trip) => (trip.school_id ?? trip.school?.id) === schoolId);
  }, [form.school_id, trips]);

  const isFormReady = useMemo(() => {
    const basic = form.passengerName.trim() && form.passengerLastName.trim() && form.passengerDni.trim() &&
      form.passengerBirthDate && form.school_id && form.trip_id && form.shift_id &&
      form.responsibleName.trim() && form.responsibleLastName.trim() && form.dni.trim() && form.birthDate &&
      form.email.includes("@") && form.phone.trim() && form.address.trim() && form.city.trim();
    if (!basic) return false;
    if (form.hasSpecialPrice) return Number(form.specialPrice) > 0;
    return true;
  }, [form]);

  const persist = (next: PassengerItem[]) => {
    setItems(next);
    saveStoredPassengers(next);
  };

  const computeTripValue = (tripId: number) => {
    const basePrice = readTripPriceSettings()[tripId] ?? 820000;
    if (form.hasSpecialPrice) return Number(form.specialPrice);
    if (form.isAdultCompanion) return Math.round(basePrice * 0.3);
    return basePrice;
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormReady) return;

    const school = schools.find((item) => item.id === Number(form.school_id));
    const trip = trips.find((item) => item.id === Number(form.trip_id));
    const shift = shifts.find((item) => item.id === Number(form.shift_id));
    if (!school || !trip || !shift) return;

    const tripLabel = trip.grade?.name ?? trip.group_name ?? String(trip.year);
    const tripValue = computeTripValue(trip.id);
    const count = Math.max(1, Number(form.numInstallments));
    const installmentSum = installments.slice(0, count).reduce((acc, value) => acc + value, 0);
    const finalInstallments = installmentSum > 0 ? installments.slice(0, count) : distributeInstallments(tripValue, count);

    const nextItem: PassengerItem = {
      id: editingId ?? Date.now(),
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
      isAdultCompanion: form.isAdultCompanion,
      hasSpecialPrice: form.hasSpecialPrice,
      trip_value: tripValue,
      paid_amount: 0,
      num_installments: count,
      installments: finalInstallments,
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

    if (editingId) {
      persist(items.map((item) => (item.id === editingId ? nextItem : item)));
    } else {
      persist([nextItem, ...items]);
    }

    setEditingId(null);
    setForm(initialForm);
    setInstallments(Array.from({ length: 8 }, () => 0));
  };

  const startEdit = (item: PassengerItem) => {
    setEditingId(item.id);
    setForm({
      passengerName: item.passengerName,
      passengerLastName: item.passengerLastName,
      passengerDni: item.passengerDni,
      passengerBirthDate: item.passengerBirthDate,
      school_id: String(item.school_id),
      trip_id: String(item.trip_id),
      shift_id: String(item.shift_id),
      isAdultCompanion: item.isAdultCompanion,
      hasSpecialPrice: item.hasSpecialPrice,
      specialPrice: item.hasSpecialPrice ? String(item.trip_value) : "",
      numInstallments: String(item.num_installments),
      responsibleName: item.responsible.name,
      responsibleLastName: item.responsible.lastName,
      dni: item.responsible.dni,
      birthDate: item.responsible.birthDate,
      email: item.responsible.email,
      phone: item.responsible.phone,
      address: item.responsible.address,
      city: item.responsible.city
    });
    setInstallments(item.installments);
  };

  const removeItem = (id: number) => persist(items.filter((item) => item.id !== id));

  const installmentInputs = Array.from({ length: Math.max(1, Number(form.numInstallments) || 1) }, (_, index) => index);

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>Pasajeros</h1>
          <p>Ahora cada pasajero tiene cuotas configurables y edición completa de precio.</p>
        </div>
        <span className="badge">{items.length} pasajeros</span>
      </header>

      {error ? <p className="form-error">{error}</p> : null}

      <form className="card form-grid" onSubmit={onSubmit}>
        <div className="form-row">
          <label className="field"><span>Nombre pasajero</span><input value={form.passengerName} onChange={(e)=>setForm(c=>({...c,passengerName:e.target.value}))} required /></label>
          <label className="field"><span>Apellido pasajero</span><input value={form.passengerLastName} onChange={(e)=>setForm(c=>({...c,passengerLastName:e.target.value}))} required /></label>
          <label className="field"><span>DNI pasajero</span><input value={form.passengerDni} onChange={(e)=>setForm(c=>({...c,passengerDni:e.target.value}))} required /></label>
          <label className="field"><span>Fecha nacimiento pasajero</span><input type="date" value={form.passengerBirthDate} onChange={(e)=>setForm(c=>({...c,passengerBirthDate:e.target.value}))} required /></label>
        </div>

        <div className="form-row">
          <label className="field"><span>Escuela</span><select value={form.school_id} onChange={(e)=>setForm(c=>({...c,school_id:e.target.value,trip_id:""}))} required><option value="">Seleccionar</option>{schools.map((s)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label className="field"><span>Salida</span><select value={form.trip_id} onChange={(e)=>setForm(c=>({...c,trip_id:e.target.value}))} required disabled={!form.school_id}><option value="">Seleccionar</option>{filteredTrips.map((t)=><option key={t.id} value={t.id}>{t.grade?.name ?? t.group_name ?? t.year}</option>)}</select></label>
          <label className="field"><span>Turno</span><select value={form.shift_id} onChange={(e)=>setForm(c=>({...c,shift_id:e.target.value}))} required><option value="">Seleccionar</option>{shifts.map((s)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label className="field"><span>Cantidad de cuotas</span><input type="number" min="1" max="18" value={form.numInstallments} onChange={(e)=>setForm(c=>({...c,numInstallments:e.target.value}))} required /></label>
        </div>

        <div className="form-row checkbox-row">
          <label><input type="checkbox" checked={form.isAdultCompanion} onChange={(e)=>setForm(c=>({...c,isAdultCompanion:e.target.checked,hasSpecialPrice:e.target.checked ? false : c.hasSpecialPrice,specialPrice:e.target.checked ? "" : c.specialPrice}))} /> Mayor acompañante (30% del viaje)</label>
          <label><input type="checkbox" checked={form.hasSpecialPrice} onChange={(e)=>setForm(c=>({...c,hasSpecialPrice:e.target.checked,isAdultCompanion:e.target.checked ? false : c.isAdultCompanion}))} /> Precio especial</label>
          {form.hasSpecialPrice ? <label className="field inline-field"><span>Precio especial</span><input type="number" min="1" value={form.specialPrice} onChange={(e)=>setForm(c=>({...c,specialPrice:e.target.value}))} required /></label> : null}
        </div>

        <div className="card">
          <h3>Cuotas del pasajero</h3>
          <div className="form-row installments-grid">
            {installmentInputs.map((index) => (
              <label key={index} className="field">
                <span>Cuota {index + 1}</span>
                <input type="number" min="0" value={installments[index] ?? 0} onChange={(e)=>setInstallments((current)=>{
                  const next=[...current];
                  next[index]=Number(e.target.value||0);
                  return next;
                })} />
              </label>
            ))}
          </div>
        </div>

        <div className="form-row">
          <label className="field"><span>Nombre responsable</span><input value={form.responsibleName} onChange={(e)=>setForm(c=>({...c,responsibleName:e.target.value}))} required /></label>
          <label className="field"><span>Apellido responsable</span><input value={form.responsibleLastName} onChange={(e)=>setForm(c=>({...c,responsibleLastName:e.target.value}))} required /></label>
          <label className="field"><span>DNI responsable</span><input value={form.dni} onChange={(e)=>setForm(c=>({...c,dni:e.target.value}))} required /></label>
        </div>

        <div className="form-row">
          <label className="field"><span>Fecha nac. responsable</span><input type="date" value={form.birthDate} onChange={(e)=>setForm(c=>({...c,birthDate:e.target.value}))} required /></label>
          <label className="field"><span>Email</span><input type="email" value={form.email} onChange={(e)=>setForm(c=>({...c,email:e.target.value}))} required /></label>
          <label className="field"><span>Teléfono</span><input value={form.phone} onChange={(e)=>setForm(c=>({...c,phone:e.target.value}))} required /></label>
        </div>

        <div className="form-row">
          <label className="field"><span>Dirección</span><input value={form.address} onChange={(e)=>setForm(c=>({...c,address:e.target.value}))} required /></label>
          <label className="field"><span>Ciudad</span><input value={form.city} onChange={(e)=>setForm(c=>({...c,city:e.target.value}))} required /></label>
        </div>

        <div className="form-actions"><button type="submit" className="btn" disabled={!isFormReady}>{editingId ? "Guardar cambios" : "Guardar pasajero"}</button></div>
      </form>

      <div className="card placeholder-table">
        <div className="table-row header passengers-table-row-extended"><span>Pasajero</span><span>Escuela / Salida</span><span>Turno</span><span>Precio</span><span>Cuotas</span><span>Acción</span></div>
        {items.map((item) => (
          <div key={item.id} className="table-row passengers-table-row-extended">
            <span>{item.passengerName} {item.passengerLastName}</span>
            <span>{item.school_name} · {item.trip_label}</span>
            <span>{item.shift_name}</span>
            <span>${item.trip_value.toLocaleString("es-AR")}</span>
            <span>{item.num_installments}</span>
            <span><button type="button" className="link" onClick={() => startEdit(item)}>Editar</button><button type="button" className="link" onClick={() => removeItem(item.id)}>Eliminar</button></span>
          </div>
        ))}
      </div>
    </section>
  );
}
