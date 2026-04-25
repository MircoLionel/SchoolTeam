import { useEffect, useMemo, useState } from "react";
import { deletePassenger, extractCollection, fetchPassengers } from "../services/api";
import { useAuth } from "../state/AuthContext";
import { getPassengerBalance, PassengerItem } from "../state/passengersStorage";

// Archivo saneado: exportación exclusiva CSV (sin bloques HTML/XLS heredados).
const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

const toCsvCell = (value: unknown): string => `"${String(value).replaceAll('"', '""')}"`;

function normalizePassengers(payload: unknown): PassengerItem[] {
  const records = extractCollection<Record<string, unknown>>(payload);

  return records.map((record, index) => {
    const id = Number(record.id ?? Date.now() + index);
    const tripId = Number(record.trip_id ?? (record.trip as { id?: unknown } | undefined)?.id ?? 0);
    const schoolId = Number(record.school_id ?? (record.school as { id?: unknown } | undefined)?.id ?? 0);
    const shiftId = Number(record.shift_id ?? (record.shift as { id?: unknown } | undefined)?.id ?? 0);
    const fullName = typeof record.full_name === "string" ? record.full_name.trim() : "";
    const splitName = fullName ? fullName.split(/\s+/) : [];
    const responsible = (record.responsible as Record<string, unknown> | undefined)
      ?? (record.guardian as Record<string, unknown> | undefined)
      ?? {};

    const numInstallments = Math.max(1, Number(record.num_installments ?? 8));
    const installments = Array.isArray(record.installments)
      ? (record.installments as unknown[]).map((value) =>
        typeof value === "number"
          ? value
          : Number((value as { amount?: unknown } | undefined)?.amount ?? 0)
      )
      : Array.from({ length: numInstallments }, () => 0);

    const tripValue = Number(
      record.trip_value
      ?? (record.trip as { latest_budget?: { price_per_passenger?: unknown } } | undefined)?.latest_budget?.price_per_passenger
      ?? (record.trip as { latest_budget?: { base_price_100?: unknown } } | undefined)?.latest_budget?.base_price_100
      ?? 0
    );

    return {
      id: Number.isFinite(id) ? id : Date.now() + index,
      passengerName: String(record.passenger_name ?? splitName[0] ?? ""),
      passengerLastName: String(record.passenger_last_name ?? splitName.slice(1).join(" ")),
      passengerDni: String(record.passenger_dni ?? record.dni ?? ""),
      passengerBirthDate: String(record.passenger_birth_date ?? record.birthdate ?? ""),
      school_id: schoolId,
      school_name: String((record.school as { name?: unknown } | undefined)?.name ?? ""),
      trip_id: tripId,
      trip_label: String((record.trip as { group_name?: unknown } | undefined)?.group_name ?? ""),
      trip_destination: String((record.trip as { destination?: unknown } | undefined)?.destination ?? ""),
      trip_contract_number: String((record.trip as { contract_number?: unknown } | undefined)?.contract_number ?? ""),
      shift_id: shiftId,
      shift_name: String((record.shift as { name?: unknown } | undefined)?.name ?? ""),
      isAdultCompanion: Boolean(record.is_adult_companion),
      hasSpecialPrice: Boolean(record.has_special_price),
      trip_value: Number.isFinite(tripValue) ? tripValue : 0,
      paid_amount: Number(record.paid_amount ?? 0),
      num_installments: numInstallments,
      installments,
      responsible: {
        name: String(responsible.name ?? ""),
        lastName: String(responsible.last_name ?? responsible.lastName ?? ""),
        dni: String(responsible.dni ?? ""),
        birthDate: String(responsible.birth_date ?? responsible.birthDate ?? ""),
        email: String(responsible.email ?? ""),
        phone: String(responsible.phone ?? ""),
        address: String(responsible.address ?? ""),
        city: String(responsible.city ?? "")
      },
      created_by: String(record.created_by ?? "Sistema"),
      created_at: String(record.created_at ?? new Date().toISOString()),
      last_modified_by: String(record.last_modified_by ?? record.created_by ?? "Sistema"),
      last_modified_at: String(record.last_modified_at ?? record.created_at ?? new Date().toISOString()),
      last_modified_action: "update"
    };
  });
}

export function TripPassengers() {
  const { token } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const tripId = Number(params.get("tripId") ?? "0");
  const [items, setItems] = useState<PassengerItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedShift, setSelectedShift] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "shift">("name");

  const loadPassengers = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await fetchPassengers(token);
      const normalized = normalizePassengers(response);
      setItems(normalized.filter((item) => item.trip_id === tripId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los pasajeros.");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPassengers();
  }, [token, tripId]);

  const passengers = items;

  const shiftOptions = useMemo(
    () => Array.from(new Set(passengers.map((passenger) => passenger.shift_name))).sort((a, b) => a.localeCompare(b, "es")),
    [passengers]
  );

  const visiblePassengers = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();

    const filtered = passengers.filter((passenger) => {
      if (selectedShift !== "all" && passenger.shift_name !== selectedShift) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const fullName = `${passenger.passengerName} ${passenger.passengerLastName}`.toLowerCase();
      return fullName.includes(normalizedQuery);
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "shift") {
        const byShift = a.shift_name.localeCompare(b.shift_name, "es");
        if (byShift !== 0) return byShift;
      }

      const aName = `${a.passengerLastName} ${a.passengerName}`;
      const bName = `${b.passengerLastName} ${b.passengerName}`;
      return aName.localeCompare(bName, "es");
    });
  }, [passengers, search, selectedShift, sortBy]);

  const exportCsv = () => {
    const planInstallments = Number(visiblePassengers[0]?.num_installments ?? 0);
    const headers: Array<string> = [
      "Nombre y Apellido",
      "DNI",
      "Fecha de Nac",
      "Precio",
      "Cantidad Cuotas",
      ...Array.from({ length: planInstallments }, (_, index) => `Cuota ${index + 1}`),
      "Saldo",
      "Turno"
    ];

    const rows = visiblePassengers.map((passenger): Array<string | number> => {
      const installments = Array.from(
        { length: planInstallments },
        (_, index) => (index < Number(passenger.num_installments) ? passenger.installments[index] ?? 0 : "")
      );

      return [
        `${passenger.passengerName} ${passenger.passengerLastName}`,
        passenger.passengerDni,
        new Date(`${passenger.passengerBirthDate}T00:00:00`).toLocaleDateString("es-AR"),
        passenger.trip_value,
        passenger.num_installments,
        ...installments,
        getPassengerBalance(passenger),
        passenger.shift_name
      ];
    });

    const csvRows = [headers, ...rows];
    const csv = csvRows
      .map((row) => row.map(toCsvCell).join(";"))
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pasajeros-salida-${tripId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDeletePassenger = async (passengerId: number) => {
    const target = passengers.find((item) => item.id === passengerId);
    if (!target || !token) return;

    const confirmed = window.confirm(
      `¿Eliminar a ${target.passengerName} ${target.passengerLastName}? Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    try {
      await deletePassenger(token, passengerId);
      await loadPassengers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el pasajero.");
    }
  };

  return (
    <section className="stack standalone-page">
      <header className="page-header">
        <div>
          <h1>Pasajeros de la salida #{tripId}</h1>
          <p>Listado sincronizado con backend. Podés filtrar por nombre/turno y ordenar por turno.</p>
        </div>
        <button type="button" className="btn" onClick={exportCsv}>Exportar CSV</button>
      </header>

      <div className="card form-grid">
        <label className="field">
          <span>Buscar por nombre</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ej: Antonela Machuca"
          />
        </label>
        <label className="field">
          <span>Filtrar por turno</span>
          <select value={selectedShift} onChange={(event) => setSelectedShift(event.target.value)}>
            <option value="all">Todos</option>
            {shiftOptions.map((shift) => (
              <option key={shift} value={shift}>{shift}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Ordenar</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as "name" | "shift")}>
            <option value="name">Apellido y nombre</option>
            <option value="shift">Turno y apellido</option>
          </select>
        </label>
      </div>

      {error ? <p className="error-banner">{error}</p> : null}

      <div className="card placeholder-table">
        <div className="table-row header trip-passengers-row-extended">
          <span>Nombre</span>
          <span>Apellido</span>
          <span>DNI</span>
          <span>Fecha de nacimiento</span>
          <span>Precio viaje</span>
          <span>Cuotas</span>
          <span>Estado de cuenta</span>
          <span>Turno</span>
          <span>Acciones</span>
        </div>

        {!isLoading && visiblePassengers.length === 0 ? (
          <div className="table-row trip-passengers-row-extended">
            <span>No hay pasajeros para el filtro seleccionado.</span><span>-</span><span>-</span><span>-</span>
            <span>-</span><span>-</span><span>-</span><span>-</span><span>-</span>
          </div>
        ) : null}

        {visiblePassengers.map((passenger) => {
          const remaining = getPassengerBalance(passenger);
          return (
            <div key={passenger.id} className="table-row trip-passengers-row-extended">
              <span>{passenger.passengerName}</span>
              <span>{passenger.passengerLastName}</span>
              <span>{passenger.passengerDni}</span>
              <span>{new Date(`${passenger.passengerBirthDate}T00:00:00`).toLocaleDateString("es-AR")}</span>
              <span>{currencyFormatter.format(passenger.trip_value)}</span>
              <span>{passenger.num_installments}</span>
              <span>{currencyFormatter.format(remaining)}</span>
              <span>{passenger.shift_name}</span>
              <span>
                <button type="button" className="btn btn-danger" onClick={() => handleDeletePassenger(passenger.id)}>
                  Eliminar
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
