import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { extractCollection, fetchPassengers, fetchTrips, renderCheckbookPdf } from "../services/api";
import { useAuth } from "../state/AuthContext";
import { appendPassengerAudit, getPassengerBalance, PassengerItem, readPassengerAudit, saveStoredPassengers } from "../state/passengersStorage";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

interface TripOption {
  id: number;
  label: string;
}

export function Accounts() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [query, setQuery] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [selectedTrip, setSelectedTrip] = useState("all");
  const [printAuditVersion, setPrintAuditVersion] = useState(0);
  const [tripDestinations, setTripDestinations] = useState<Record<number, string>>({});
  const [backendTrips, setBackendTrips] = useState<TripOption[]>([]);
  const [passengers, setPassengers] = useState<PassengerItem[]>([]);

  const normalizePassengers = (payload: unknown): PassengerItem[] => {
    const records = extractCollection<Record<string, unknown>>(payload);
    return records.map((record, index) => {
      const id = Number(record.id ?? Date.now() + index);
      const fullName = typeof record.full_name === "string" ? record.full_name.trim() : "";
      const splitName = fullName ? fullName.split(/\s+/) : [];
      const trip = record.trip as Record<string, unknown> | undefined;
      const school = record.school as Record<string, unknown> | undefined;
      const shift = record.shift as Record<string, unknown> | undefined;
      const guardian = (record.responsible as Record<string, unknown> | undefined)
        ?? (record.guardian as Record<string, unknown> | undefined)
        ?? {};
      const guardianFullName = typeof guardian.full_name === "string" ? guardian.full_name.trim() : "";
      const guardianParts = guardianFullName ? guardianFullName.split(/\s+/) : [];
      const numInstallments = Math.max(1, Number(record.num_installments ?? 8));
      const installments = Array.isArray(record.installments)
        ? (record.installments as unknown[]).map((value) =>
          typeof value === "number"
            ? value
            : Number((value as { amount?: unknown } | undefined)?.amount ?? 0)
        )
        : Array.from({ length: numInstallments }, () => 0);

      return {
        id: Number.isFinite(id) ? id : Date.now() + index,
        passengerName: String(record.passenger_name ?? splitName[0] ?? ""),
        passengerLastName: String(record.passenger_last_name ?? splitName.slice(1).join(" ")),
        passengerDni: String(record.passenger_dni ?? record.dni ?? ""),
        passengerBirthDate: String(record.passenger_birth_date ?? record.birthdate ?? ""),
        school_id: Number(record.school_id ?? school?.id ?? 0),
        school_name: String(school?.name ?? ""),
        trip_id: Number(record.trip_id ?? trip?.id ?? 0),
        trip_label: String((trip?.grade as { name?: unknown } | undefined)?.name ?? trip?.group_name ?? ""),
        trip_destination: String(trip?.destination ?? ""),
        trip_contract_number: String(trip?.contract_number ?? ""),
        shift_id: Number(record.shift_id ?? shift?.id ?? 0),
        shift_name: String(shift?.name ?? ""),
        isAdultCompanion: Boolean(record.is_adult_companion),
        hasSpecialPrice: Boolean(record.has_special_price),
        trip_value: Number(record.trip_value ?? (trip?.latest_budget as { base_price_100?: unknown } | undefined)?.base_price_100 ?? 0),
        paid_amount: Number(record.paid_amount ?? 0),
        num_installments: numInstallments,
        installments,
        responsible: {
          name: String(guardian.first_name ?? guardian.name ?? guardianParts[0] ?? ""),
          lastName: String(guardian.last_name ?? guardianParts.slice(1).join(" ")),
          dni: String(guardian.dni ?? ""),
          birthDate: String(guardian.birth_date ?? guardian.birthdate ?? ""),
          email: String(guardian.email ?? ""),
          phone: String(guardian.phone ?? ""),
          address: String(guardian.address ?? ""),
          city: String(guardian.locality ?? guardian.city ?? ""),
        },
        created_by: String(record.created_by ?? "Sistema"),
        created_at: String(record.created_at ?? new Date().toISOString()),
        last_modified_by: String(record.last_modified_by ?? record.created_by ?? "Sistema"),
        last_modified_at: String(record.last_modified_at ?? record.created_at ?? new Date().toISOString()),
        last_modified_action: (record.last_modified_action as PassengerItem["last_modified_action"]) ?? "create",
      };
    });
  };

  useEffect(() => {
    if (!token) return;

    Promise.all([fetchTrips(token), fetchPassengers(token)])
      .then(([tripsPayload, passengersPayload]) => {
        const records = extractCollection<Record<string, unknown>>(tripsPayload);
        const normalizedPassengers = normalizePassengers(passengersPayload);
        setPassengers(normalizedPassengers);
        saveStoredPassengers(normalizedPassengers);

        const map: Record<number, string> = {};
        const options: TripOption[] = [];

        records.forEach((trip) => {
          if (!trip || typeof trip !== "object") return;
          const id = Number(trip.id);
          if (!Number.isFinite(id)) return;

          const destination = typeof trip.destination === "string" ? trip.destination.trim() : "";
          if (destination) {
            map[id] = destination;
          }

          const label = String(
            (trip.grade as { name?: unknown } | undefined)?.name
            ?? trip.group_name
            ?? trip.destination
            ?? `Viaje #${id}`
          ).trim();

          options.push({
            id,
            label: label || `Viaje #${id}`,
          });
        });

        setTripDestinations(map);
        setBackendTrips(options.sort((a, b) => a.label.localeCompare(b.label, "es")));
      })
      .catch(() => {
        setPassengers([]);
      });
  }, [token]);

  const schoolTabs = useMemo(() => {
    const schools = Array.from(new Set(passengers.map((passenger) => passenger.school_name))).sort((a, b) =>
      a.localeCompare(b, "es")
    );
    return ["all", ...schools];
  }, [passengers]);

  const tripOptions = useMemo(() => {
    if (selectedSchool === "all") {
      return backendTrips;
    }

    const schoolTripIds = new Set(
      passengers
        .filter((passenger) => passenger.school_name === selectedSchool)
        .map((passenger) => passenger.trip_id)
    );

    if (schoolTripIds.size === 0) {
      return backendTrips;
    }

    return backendTrips.filter((trip) => schoolTripIds.has(trip.id));
  }, [backendTrips, passengers, selectedSchool]);


  const lastPrintByPassenger = useMemo(() => {
    const lastPrinted = new Map<number, string>();

    readPassengerAudit().forEach((entry) => {
      const detail = entry.detail?.toLowerCase() ?? "";
      if (!detail.includes("imprimi") || !detail.includes("chequera")) return;

      const prev = lastPrinted.get(entry.passengerId);
      if (!prev || new Date(entry.createdAt).getTime() > new Date(prev).getTime()) {
        lastPrinted.set(entry.passengerId, entry.createdAt);
      }
    });

    return lastPrinted;
  }, [printAuditVersion]);

  const rows = useMemo(() => {
    if (!passengers.length) {
      return [];
    }

    const normalized = query.trim().toLowerCase();

    return passengers
      .filter((passenger) => {
        const isSchoolMatch = selectedSchool === "all" || passenger.school_name === selectedSchool;
        if (!isSchoolMatch) return false;
        const hasTripFilter = selectedTrip !== "all" && selectedTrip !== "";
        if (hasTripFilter && passenger.trip_id !== Number(selectedTrip)) return false;
        if (!normalized) return true;
        const fullName = `${passenger.passengerName} ${passenger.passengerLastName}`.toLowerCase();
        return (
          fullName.includes(normalized) ||
          passenger.passengerName.toLowerCase().includes(normalized) ||
          passenger.passengerLastName.toLowerCase().includes(normalized) ||
          passenger.passengerDni.includes(normalized)
        );
      })
      .map((passenger) => {
        const paidAmount = passenger.paid_amount;
        const overpaidAmount = Math.max(0, paidAmount - passenger.trip_value);
        const baseTripValue = Math.max(1, passenger.trip_value);
        const paidPct = Math.max(0, Math.min(100, (paidAmount / baseTripValue) * 100));
        const barTotal = overpaidAmount > 0 ? baseTripValue + overpaidAmount : baseTripValue;
        const rawGreenWidth = overpaidAmount > 0 ? (overpaidAmount / barTotal) * 100 : 0;
        const greenWidth = overpaidAmount > 0 ? Math.max(rawGreenWidth, 8) : 0;
        const redWidth = overpaidAmount > 0
          ? Math.max(0, 100 - greenWidth)
          : Math.min(100, paidPct);
        const grayWidth = overpaidAmount > 0 ? 0 : Math.max(0, 100 - paidPct);
        const balance = getPassengerBalance(passenger);

        return {
          id: passenger.id,
          passenger: `${passenger.passengerName} ${passenger.passengerLastName}`,
          responsible: `${passenger.responsible.name} ${passenger.responsible.lastName}`,
          dni: passenger.passengerDni,
          tripValue: passenger.trip_value,
          paidAmount,
          paidPct,
          redWidth,
          grayWidth,
          balance,
          overpaidAmount,
          remainingAmount: Math.max(0, passenger.trip_value - paidAmount),
          installments: passenger.installments,
          tripLabel: passenger.trip_label,
          tripDestination: passenger.trip_destination ?? tripDestinations[passenger.trip_id] ?? "",
          contractNumber: passenger.trip_contract_number ?? String(passenger.trip_id),
          schoolName: passenger.school_name,
          lastPrintedAt: lastPrintByPassenger.get(passenger.id)
        };
      });
  }, [lastPrintByPassenger, passengers, query, selectedSchool, selectedTrip, tripDestinations]);

  const printCheckbook = async (row: (typeof rows)[number]) => {
    if (!token) {
      window.alert("No hay sesión activa para generar la chequera.");
      return;
    }

    try {
      const printableName = row.passenger
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();

      const fileName = `cheq-${(printableName || `pax-${row.id}`).slice(0, 45)}.pdf`;

      const payload = {
        code: `cheq-${(printableName || `pax-${row.id}`).slice(0, 45)}`,
        header: {
          contrato: row.schoolName,
          grupo: row.tripLabel,
          destino: row.tripDestination,
          padre_tutor: row.responsible,
          pax: row.passenger,
          dni: row.dni,
          periodo: "-"
        },
        installments: row.installments.map((value, index) => ({
          nro_cuota: String(index + 1),
          importe: Number(value ?? 0)
        }))
      };

      const pdfBlob = await renderCheckbookPdf(token, payload);
      const pdfUrl = URL.createObjectURL(pdfBlob);

      const popup = window.open("", "_blank");
      if (!popup) {
        window.alert("El navegador bloqueó la ventana de impresión.");
        URL.revokeObjectURL(pdfUrl);
        return;
      }

      popup.document.write(`<!doctype html><html><head><title>${fileName}</title></head><body style="margin:0"><iframe id="pdfFrame" src="${pdfUrl}" style="border:0;width:100vw;height:100vh"></iframe></body></html>`);
      popup.document.close();

      const iframe = popup.document.getElementById("pdfFrame") as HTMLIFrameElement | null;
      iframe?.addEventListener("load", () => {
        popup.focus();
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      });

      const downloadLink = document.createElement("a");
      downloadLink.href = pdfUrl;
      downloadLink.download = fileName;
      downloadLink.style.display = "none";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      appendPassengerAudit({
        id: Date.now(),
        passengerId: row.id,
        passengerLabel: row.passenger,
        action: "payment",
        actorName: user?.name ?? "Sistema",
        actorRole: user?.role ?? "UNKNOWN",
        createdAt: new Date().toISOString(),
        detail: "Imprimió chequera",
      });
      setPrintAuditVersion((current) => current + 1);

      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo generar la chequera.";
      window.alert(message);
    }
  };

  const editPassenger = (id: number) => {
    navigate(`/passengers?editPassengerId=${id}`);
  };

  return (
    <section className="stack">
      <header className="page-header">
        <div>
          <h1>Estado de cuenta</h1>
          <p>Buscá por nombre, apellido o DNI para consultar un pasajero puntual.</p>
        </div>
      </header>

      <div className="card form-grid">
        <div className="school-tabs">
          {schoolTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`tab-btn ${selectedSchool === tab ? "active" : ""}`}
              onClick={() => {
                setSelectedSchool(tab);
                setSelectedTrip("all");
              }}
            >
              {tab === "all" ? "Todas las escuelas" : tab}
            </button>
          ))}
        </div>
        <label className="field">
          <span>Salida (viaje)</span>
          <select value={selectedTrip} onChange={(event) => setSelectedTrip(event.target.value)}>
            <option value="all">Todas las salidas</option>
            {tripOptions.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {trip.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Buscar pasajero</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ej: Pérez o 40111222"
          />
        </label>
      </div>

      <div className="card account-list">
        {rows.length === 0 ? <p>No hay pasajeros para el filtro seleccionado.</p> : null}

        {rows.map((row) => (
          <article key={row.id} className="account-item">
            <div className="account-head">
              <h3>
                {row.passenger} · DNI {row.dni}
              </h3>
              <span>
                Pagó {currencyFormatter.format(row.paidAmount)} de {currencyFormatter.format(row.tripValue)} ({" "}
                {row.paidPct.toFixed(1)}%)
              </span>
              <span>
                Estado de cuenta: <strong>{currencyFormatter.format(row.balance)}</strong>
              </span>
              <span>
                Chequera: <strong>{row.lastPrintedAt ? "Impresa" : "Pendiente"}</strong>
                {row.lastPrintedAt ? ` · Última impresión: ${new Date(row.lastPrintedAt).toLocaleString("es-AR")}` : ""}
              </span>
            </div>

            <div className="progress-stack" aria-label={`Estado de cuenta de ${row.passenger}`}>
              <div className="segment red" style={{ width: `${row.redWidth}%` }} />
              {row.greenWidth > 0 ? <div className="segment green" style={{ width: `${row.greenWidth}%`, backgroundColor: "#12b76a" }} /> : null}
              {row.grayWidth > 0 ? <div className="segment gray" style={{ width: `${row.grayWidth}%` }} /> : null}
            </div>

            <div className="legend-grid">
              <span>
                <strong>Cobrado:</strong> {currencyFormatter.format(row.paidAmount)}
              </span>
              <span>
                <strong>Resta cobrar:</strong> {currencyFormatter.format(row.remainingAmount)}
              </span>
              {row.overpaidAmount > 0 ? (
                <span>
                  <strong>Pago excedido:</strong> {currencyFormatter.format(row.overpaidAmount)}
                </span>
              ) : null}
              <div className="account-actions">
                <button type="button" className="btn" onClick={() => printCheckbook(row)}>Imprimir chequera</button>
                <button type="button" className="btn" onClick={() => editPassenger(row.id)}>Editar pasajero</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
