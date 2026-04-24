import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PassengerType, createPassenger, extractCollection, fetchPassengerTypes, fetchPassengers, fetchSchools, fetchShifts, fetchTrips } from "../services/api";
import { useAuth } from "../state/AuthContext";
import { appendPassengerAudit, PassengerItem, readStoredPassengers, saveStoredPassengers } from "../state/passengersStorage";
import { readTripPriceSettings } from "./Trips";

interface SchoolItem { id: number; name: string }
interface ShiftItem { id: number; name: string }
interface TripItem {
  id: number;
  group_name: string;
  destination?: string;
  contract_number?: string;
  year: number;
  school_id?: number;
  school?: { id: number; name: string } | null;
  grade?: { id: number; name: string } | null;
  grade_id?: number;
  grade_shift_id?: number;
}

type ApiPassengerRecord = Record<string, unknown>;

const initialForm = {
  passengerName: "",
  passengerLastName: "",
  passengerDni: "",
  passengerBirthDate: "",
  school_id: "",
  trip_id: "",
  shift_id: "",
  passenger_type_id: "",
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

const PASSENGER_FORM_TEMPLATE_KEY = "schoolteam.passengers.form-template";

type PassengerForm = typeof initialForm;

interface PassengerFormTemplate {
  school_id: string;
  trip_id: string;
  shift_id: string;
  passenger_type_id: string;
  isAdultCompanion: boolean;
  hasSpecialPrice: boolean;
  specialPrice: string;
  numInstallments: string;
  installments: number[];
}

function distributeInstallments(total: number, count: number) {
  const safeCount = Math.max(1, count);
  const base = Math.floor(total / safeCount);
  return Array.from({ length: safeCount }, (_, index) =>
    index === safeCount - 1 ? total - base * (safeCount - 1) : base
  );
}

function readFormTemplate(): PassengerFormTemplate | null {
  const raw = sessionStorage.getItem(PASSENGER_FORM_TEMPLATE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PassengerFormTemplate>;
    return {
      school_id: String(parsed.school_id ?? ""),
      trip_id: String(parsed.trip_id ?? ""),
      shift_id: String(parsed.shift_id ?? ""),
      passenger_type_id: String(parsed.passenger_type_id ?? ""),
      isAdultCompanion: Boolean(parsed.isAdultCompanion),
      hasSpecialPrice: Boolean(parsed.hasSpecialPrice),
      specialPrice: String(parsed.specialPrice ?? ""),
      numInstallments: String(parsed.numInstallments ?? "8"),
      installments: Array.isArray(parsed.installments)
        ? parsed.installments.map((value) => Number(value ?? 0))
        : Array.from({ length: 8 }, () => 0)
    };
  } catch {
    return null;
  }
}

function mergeFormWithTemplate(template: PassengerFormTemplate | null): PassengerForm {
  if (!template) return initialForm;
  return {
    ...initialForm,
    school_id: template.school_id,
    trip_id: template.trip_id,
    shift_id: template.shift_id,
    passenger_type_id: template.passenger_type_id,
    isAdultCompanion: template.isAdultCompanion,
    hasSpecialPrice: template.hasSpecialPrice,
    specialPrice: template.specialPrice,
    numInstallments: template.numInstallments
  };
}

function getInstallmentsFromTemplate(template: PassengerFormTemplate | null): number[] {
  if (!template?.installments?.length) return Array.from({ length: 8 }, () => 0);
  return template.installments;
}

export function Passengers() {
  const { token, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<PassengerItem[]>([]);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [passengerTypes, setPassengerTypes] = useState<PassengerType[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PassengerForm>(() => mergeFormWithTemplate(readFormTemplate()));
  const [installments, setInstallments] = useState<number[]>(() => getInstallmentsFromTemplate(readFormTemplate()));

  const filteredTrips = useMemo(() => {
    if (!form.school_id) return [];
    const schoolId = Number(form.school_id);
    return trips.filter((trip) => (trip.school_id ?? trip.school?.id) === schoolId);
  }, [form.school_id, trips]);

  function computeTripValue(tripId: number) {
    const basePrice = readTripPriceSettings()[tripId] ?? 820000;
    if (form.hasSpecialPrice) return Number(form.specialPrice);
    if (form.isAdultCompanion) return Math.round(basePrice * 0.3);
    return basePrice;
  }

  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === Number(form.trip_id)),
    [form.trip_id, trips]
  );

  const tripValueForSummary = useMemo(() => {
    if (!form.trip_id) return 0;
    return computeTripValue(Number(form.trip_id));
  }, [form.trip_id, form.hasSpecialPrice, form.specialPrice, form.isAdultCompanion]);

  const visibleInstallmentsCount = Math.max(1, Number(form.numInstallments) || 1);
  const installmentsTotal = useMemo(
    () => installments.slice(0, visibleInstallmentsCount).reduce((acc, value) => acc + Number(value || 0), 0),
    [installments, visibleInstallmentsCount]
  );
  const remainingInstallmentsAmount = Math.max(0, tripValueForSummary - installmentsTotal);
  const nextEmptyInstallmentIndex = installments
    .slice(0, visibleInstallmentsCount)
    .findIndex((value) => Number(value || 0) <= 0);
  const suggestionSlots = nextEmptyInstallmentIndex >= 0
    ? visibleInstallmentsCount - nextEmptyInstallmentIndex
    : 1;
  const suggestedInstallment = suggestionSlots > 0
    ? Math.ceil(remainingInstallmentsAmount / suggestionSlots)
    : 0;

  const isFormReady = useMemo(() => {
    const basic = form.passengerName.trim() && form.passengerLastName.trim() && form.passengerDni.trim() &&
      form.passengerBirthDate && form.school_id && form.trip_id && form.shift_id && form.passenger_type_id &&
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

  const normalizePassengers = (
    payload: unknown,
    references?: { schools: SchoolItem[]; trips: TripItem[]; shifts: ShiftItem[] }
  ): PassengerItem[] => {
    const records = extractCollection<ApiPassengerRecord>(payload);
    const sourceSchools = references?.schools ?? schools;
    const sourceTrips = references?.trips ?? trips;
    const sourceShifts = references?.shifts ?? shifts;

    return records.map((record, index) => {
      const id = Number(record.id ?? Date.now() + index);
      const fullName = typeof record.full_name === "string" ? record.full_name.trim() : "";
      const splitName = fullName ? fullName.split(/\s+/) : [];
      const tripId = Number(record.trip_id ?? (record.trip as { id?: unknown } | undefined)?.id ?? 0);
      const schoolId = Number(record.school_id ?? (record.school as { id?: unknown } | undefined)?.id ?? 0);
      const shiftId = Number(record.shift_id ?? (record.shift as { id?: unknown } | undefined)?.id ?? 0);

      const trip = sourceTrips.find((item) => item.id === tripId);
      const school = sourceSchools.find((item) => item.id === schoolId);
      const shift = sourceShifts.find((item) => item.id === shiftId);
      const responsible = (record.responsible as Record<string, unknown> | undefined)
        ?? (record.guardian as Record<string, unknown> | undefined)
        ?? {};
      const responsibleFullName = typeof responsible.full_name === "string" ? responsible.full_name.trim() : "";
      const responsibleNameParts = responsibleFullName ? responsibleFullName.split(/\s+/) : [];
      const installments = Array.isArray(record.installments)
        ? (record.installments as unknown[]).map((value) =>
          typeof value === "number"
            ? value
            : Number((value as { amount?: unknown } | undefined)?.amount ?? 0)
        )
        : [];

      return {
        id: Number.isFinite(id) ? id : Date.now() + index,
        passengerName: typeof record.passengerName === "string"
          ? record.passengerName
          : typeof record.passenger_name === "string"
            ? record.passenger_name
            : splitName[0] ?? "",
        passengerLastName: typeof record.passengerLastName === "string"
          ? record.passengerLastName
          : typeof record.passenger_last_name === "string"
            ? record.passenger_last_name
            : splitName.slice(1).join(" "),
        passengerDni: String(record.passengerDni ?? record.passenger_dni ?? record.dni ?? ""),
        passengerBirthDate: String(record.passengerBirthDate ?? record.passenger_birth_date ?? record.birthdate ?? ""),
        school_id: schoolId,
        school_name: typeof record.school_name === "string"
          ? record.school_name
          : typeof (record.school as { name?: unknown } | undefined)?.name === "string"
            ? ((record.school as { name?: string }).name ?? "")
            : (school?.name ?? ""),
        trip_id: tripId,
        trip_label: typeof record.trip_label === "string"
          ? record.trip_label
          : typeof (record.trip as { group_name?: unknown; year?: unknown; grade?: { name?: unknown } } | undefined)?.grade?.name === "string"
            ? String((record.trip as { grade?: { name?: string } }).grade?.name ?? "")
            : typeof (record.trip as { group_name?: unknown } | undefined)?.group_name === "string"
              ? String((record.trip as { group_name?: string }).group_name ?? "")
              : (trip?.grade?.name ?? trip?.group_name ?? String(trip?.year ?? "")),
        trip_destination: String(
          record.trip_destination
          ?? (record.trip as { destination?: unknown } | undefined)?.destination
          ?? trip?.destination
          ?? ""
        ),
        trip_contract_number: String(
          record.trip_contract_number
          ?? (record.trip as { contract_number?: unknown } | undefined)?.contract_number
          ?? trip?.contract_number
          ?? ""
        ),
        shift_id: shiftId,
        shift_name: typeof record.shift_name === "string"
          ? record.shift_name
          : typeof (record.shift as { name?: unknown } | undefined)?.name === "string"
            ? String((record.shift as { name?: string }).name ?? "")
            : (shift?.name ?? ""),
        isAdultCompanion: Boolean(record.isAdultCompanion ?? record.is_adult_companion),
        hasSpecialPrice: Boolean(record.hasSpecialPrice ?? record.has_special_price),
        trip_value: Number(record.trip_value ?? record.tripValue ?? 0),
        paid_amount: Number(record.paid_amount ?? record.paidAmount ?? 0),
        num_installments: Number(record.num_installments ?? record.numInstallments ?? installments.length ?? 0),
        installments,
        responsible: {
          name: String(
            responsible.name
            ?? responsible.first_name
            ?? responsibleNameParts[0]
            ?? ""
          ),
          lastName: String(
            responsible.lastName
            ?? responsible.last_name
            ?? responsibleNameParts.slice(1).join(" ")
            ?? ""
          ),
          dni: String(responsible.dni ?? ""),
          birthDate: String(responsible.birthDate ?? responsible.birth_date ?? responsible.birthdate ?? ""),
          email: String(responsible.email ?? ""),
          phone: String(responsible.phone ?? ""),
          address: String(responsible.address ?? ""),
          city: String(responsible.city ?? responsible.locality ?? "")
        },
        created_by: String(record.created_by ?? ""),
        created_at: String(record.created_at ?? ""),
        last_modified_by: String(record.last_modified_by ?? ""),
        last_modified_at: String(record.last_modified_at ?? ""),
        last_modified_action: (record.last_modified_action as PassengerItem["last_modified_action"]) ?? "create"
      };
    });
  };

  const loadPassengers = async () => {
    if (!token) return;
    const response = await fetchPassengers(token);
    const normalized = normalizePassengers(response);
    console.log("[Passengers] normalized GET /passengers", normalized);
    persist(normalized);
  };

  useEffect(() => {
    let isMounted = true;
    const loadOptions = async () => {
      if (!token) return;
      try {
        const [schoolsResponse, tripsResponse, shiftsResponse, passengerTypesResponse, passengersResponse] = await Promise.all([
          fetchSchools(token), fetchTrips(token), fetchShifts(token), fetchPassengerTypes(token), fetchPassengers(token)
        ]);
        if (!isMounted) return;
        setSchools(Array.isArray(schoolsResponse) ? schoolsResponse : []);
        const nextTrips = extractCollection<TripItem>(tripsResponse);
        setTrips(nextTrips);
        setShifts(Array.isArray(shiftsResponse) ? shiftsResponse : []);
        setPassengerTypes(Array.isArray(passengerTypesResponse) ? passengerTypesResponse : []);
        const normalized = normalizePassengers(passengersResponse, {
          schools: Array.isArray(schoolsResponse) ? schoolsResponse : [],
          trips: nextTrips,
          shifts: Array.isArray(shiftsResponse) ? shiftsResponse : []
        });
        console.log("[Passengers] normalized initial load", normalized);
        persist(normalized);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        persist(readStoredPassengers());
        setError(err instanceof Error ? err.message : "No se pudieron cargar escuelas/salidas/turnos/tipos de pasajero/pasajeros.");
      }
    };
    loadOptions();
    return () => { isMounted = false; };
  }, [token]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormReady) return;

    const school = schools.find((item) => item.id === Number(form.school_id));
    const trip = trips.find((item) => item.id === Number(form.trip_id));
    const shift = shifts.find((item) => item.id === Number(form.shift_id));
    const passengerType = passengerTypes.find((item) => item.id === Number(form.passenger_type_id));
    if (!school || !trip || !shift || !passengerType) return;

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
      trip_destination: trip.destination ?? "",
      trip_contract_number: trip.contract_number ?? "",
      shift_id: shift.id,
      shift_name: shift.name,
      isAdultCompanion: form.isAdultCompanion,
      hasSpecialPrice: form.hasSpecialPrice,
      trip_value: tripValue,
      paid_amount: 0,
      num_installments: count,
      installments: finalInstallments,
      created_by: editingId ? items.find((item) => item.id === editingId)?.created_by ?? (user?.name ?? "Sistema") : (user?.name ?? "Sistema"),
      created_at: editingId ? items.find((item) => item.id === editingId)?.created_at ?? new Date().toISOString() : new Date().toISOString(),
      last_modified_by: user?.name ?? "Sistema",
      last_modified_at: new Date().toISOString(),
      last_modified_action: editingId ? "update" : "create",
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
      if (!token) {
        setError("No hay sesión activa para guardar el pasajero.");
        return;
      }
      try {
        await createPassenger(token, {
          school_id: school.id,
          trip_id: trip.id,
          shift_id: shift.id,
          grade_id: trip.grade_id ?? trip.grade?.id,
          grade_shift_id: trip.grade_shift_id,
          passenger_type_id: passengerType.id,
          passenger_name: nextItem.passengerName,
          passenger_last_name: nextItem.passengerLastName,
          passenger_dni: nextItem.passengerDni,
          passenger_birth_date: nextItem.passengerBirthDate,
          is_adult_companion: nextItem.isAdultCompanion,
          has_special_price: nextItem.hasSpecialPrice,
          trip_value: nextItem.trip_value,
          num_installments: nextItem.num_installments,
          installments: nextItem.installments,
          responsible: {
            name: nextItem.responsible.name,
            last_name: nextItem.responsible.lastName,
            dni: nextItem.responsible.dni,
            birth_date: nextItem.responsible.birthDate,
            email: nextItem.responsible.email,
            phone: nextItem.responsible.phone,
            address: nextItem.responsible.address,
            city: nextItem.responsible.city
          }
        });
        await loadPassengers();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar el pasajero.");
        return;
      }
    }
    setError(null);

    appendPassengerAudit({
      id: Date.now(),
      passengerId: nextItem.id,
      passengerLabel: `${nextItem.passengerName} ${nextItem.passengerLastName}`,
      action: editingId ? "update" : "create",
      actorName: user?.name ?? "Sistema",
      actorRole: user?.role ?? "UNKNOWN",
      createdAt: new Date().toISOString(),
      detail: editingId ? "Edición desde Pasajeros" : "Alta de pasajero"
    });

    const template: PassengerFormTemplate = {
      school_id: form.school_id,
      trip_id: form.trip_id,
      shift_id: form.shift_id,
      passenger_type_id: form.passenger_type_id,
      isAdultCompanion: form.isAdultCompanion,
      hasSpecialPrice: form.hasSpecialPrice,
      specialPrice: form.specialPrice,
      numInstallments: String(count),
      installments: finalInstallments
    };
    sessionStorage.setItem(PASSENGER_FORM_TEMPLATE_KEY, JSON.stringify(template));

    setEditingId(null);
    setForm(mergeFormWithTemplate(template));
    setInstallments(finalInstallments);
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
      passenger_type_id: "",
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

  const installmentInputs = Array.from({ length: visibleInstallmentsCount }, (_, index) => index);

  useEffect(() => {
    const editPassengerId = Number(searchParams.get("editPassengerId"));
    if (!editPassengerId) return;
    const foundItem = items.find((item) => item.id === editPassengerId);
    if (!foundItem) return;
    startEdit(foundItem);
    setSearchParams({}, { replace: true });
  }, [items, searchParams, setSearchParams]);

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
          <label className="field"><span>Tipo de pasajero</span><select value={form.passenger_type_id} onChange={(e)=>setForm(c=>({...c,passenger_type_id:e.target.value}))} required><option value="">Seleccionar</option>{passengerTypes.map((type)=><option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
          <label className="field"><span>Cantidad de cuotas</span><input type="number" min="1" max="18" value={form.numInstallments} onChange={(e)=>setForm(c=>({...c,numInstallments:e.target.value}))} required /></label>
        </div>

        <div className="form-row checkbox-row">
          <label><input type="checkbox" checked={form.isAdultCompanion} onChange={(e)=>setForm(c=>({...c,isAdultCompanion:e.target.checked,hasSpecialPrice:e.target.checked ? false : c.hasSpecialPrice,specialPrice:e.target.checked ? "" : c.specialPrice}))} /> Mayor acompañante (30% del viaje)</label>
          <label><input type="checkbox" checked={form.hasSpecialPrice} onChange={(e)=>setForm(c=>({...c,hasSpecialPrice:e.target.checked,isAdultCompanion:e.target.checked ? false : c.isAdultCompanion}))} /> Precio especial</label>
          {form.hasSpecialPrice ? <label className="field inline-field"><span>Precio especial</span><input type="number" min="1" value={form.specialPrice} onChange={(e)=>setForm(c=>({...c,specialPrice:e.target.value}))} required /></label> : null}
        </div>

        <div className="card">
          <h3>Cuotas del pasajero</h3>
          <p>
            Total viaje: ${tripValueForSummary.toLocaleString("es-AR")} · Cargado: ${installmentsTotal.toLocaleString("es-AR")} ·
            Restante: ${remainingInstallmentsAmount.toLocaleString("es-AR")}
            {remainingInstallmentsAmount > 0 ? ` · Sugerencia próxima cuota: $${suggestedInstallment.toLocaleString("es-AR")}` : " · Plan completo"}
          </p>
          {selectedTrip ? <small>Salida seleccionada: {selectedTrip.grade?.name ?? selectedTrip.group_name ?? selectedTrip.year}</small> : null}
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
        <div className="table-row header passengers-table-row-extended"><span>Pasajero</span><span>Escuela / Salida</span><span>Turno</span><span>Precio</span><span>Cuotas</span><span>Última modif.</span><span>Acción</span></div>
        <div className="passengers-scroll-area">
          {items.map((item) => (
            <div key={item.id} className="table-row passengers-table-row-extended">
              <span>{item.passengerName} {item.passengerLastName}</span>
              <span>{item.school_name} · {item.trip_label}</span>
              <span>{item.shift_name}</span>
              <span>${item.trip_value.toLocaleString("es-AR")}</span>
              <span>{item.num_installments}</span>
              <span>{item.last_modified_by ?? item.created_by ?? "Sistema"} · {new Date(item.last_modified_at ?? item.created_at ?? Date.now()).toLocaleString("es-AR")}</span>
              <span><button type="button" className="link" onClick={() => startEdit(item)}>Editar</button><button type="button" className="link" onClick={() => removeItem(item.id)}>Eliminar</button></span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
