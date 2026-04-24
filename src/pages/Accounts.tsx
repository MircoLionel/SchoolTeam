import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { extractCollection, fetchPassengers, fetchTrips, renderCheckbookPdf } from "../services/api";
import { useAuth } from "../state/AuthContext";
import { appendPassengerAudit, getPassengerBalance, PassengerItem, readPassengerAudit } from "../state/passengersStorage";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0
});

export function Accounts() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [query, setQuery] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<string>("all");
  const [selectedTrip, setSelectedTrip] = useState("");
  const [printAuditVersion, setPrintAuditVersion] = useState(0);
  const [tripDestinations, setTripDestinations] = useState<Record<number, string>>({});
  const [passengers, setPassengers] = useState<PassengerItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const normalizePassengers = (payload: unknown): PassengerItem[] => {
    return extractCollection<Record<string, unknown>>(payload).map((passenger, index) => {
      const fullName = typeof passenger.full_name === "string" ? passenger.full_name.trim() : "";
      const splitName = fullName ? fullName.split(/\s+/) : [];
      const responsible = (passenger.responsible as Record<string, unknown> | undefined)
        ?? (passenger.guardian as Record<string, unknown> | undefined)
        ?? {};
      const responsibleFullName = typeof responsible.full_name === "string" ? responsible.full_name.trim() : "";
      const responsibleNameParts = responsibleFullName ? responsibleFullName.split(/\s+/) : [];
      const installments = Array.isArray(passenger.installments)
        ? (passenger.installments as unknown[]).map((value) =>
          typeof value === "number"
            ? value
            : Number((value as { amount?: unknown } | undefined)?.amount ?? 0)
        )
        : [];

      return {
        id: Number(passenger.id ?? Date.now() + index),
        passengerName: String(passenger.passengerName ?? passenger.passenger_name ?? splitName[0] ?? ""),
        passengerLastName: String(passenger.passengerLastName ?? passenger.passenger_last_name ?? splitName.slice(1).join(" ")),
        passengerDni: String(passenger.passengerDni ?? passenger.passenger_dni ?? passenger.dni ?? ""),
        passengerBirthDate: String(passenger.passengerBirthDate ?? passenger.passenger_birth_date ?? passenger.birthdate ?? ""),
        school_id: Number(passenger.school_id ?? (passenger.school as { id?: unknown } | undefined)?.id ?? 0),
        school_name: String(
          passenger.school_name
          ?? (passenger.school as { name?: unknown } | undefined)?.name
          ?? ""
        ),
        trip_id: Number(passenger.trip_id ?? (passenger.trip as { id?: unknown } | undefined)?.id ?? 0),
        trip_label: String(
          passenger.trip_label
          ?? (passenger.trip as { grade?: { name?: unknown }; group_name?: unknown; year?: unknown } | undefined)?.grade?.name
          ?? (passenger.trip as { group_name?: unknown } | undefined)?.group_name
          ?? ""
        ),
        trip_destination: String(passenger.trip_destination ?? (passenger.trip as { destination?: unknown } | undefined)?.destination ?? ""),
        trip_contract_number: String(passenger.trip_contract_number ?? (passenger.trip as { contract_number?: unknown } | undefined)?.contract_number ?? ""),
        shift_id: Number(passenger.shift_id ?? (passenger.shift as { id?: unknown } | undefined)?.id ?? 0),
        shift_name: String(passenger.shift_name ?? (passenger.shift as { name?: unknown } | undefined)?.name ?? ""),
        isAdultCompanion: Boolean(passenger.isAdultCompanion ?? passenger.is_adult_companion),
        hasSpecialPrice: Boolean(passenger.hasSpecialPrice ?? passenger.has_special_price),
        trip_value: Number(passenger.trip_value ?? 0),
        paid_amount: Number(passenger.paid_amount ?? 0),
        num_installments: Number(passenger.num_installments ?? installments.length ?? 0),
        installments,
        responsible: {
          name: String(responsible.name ?? responsible.first_name ?? responsibleNameParts[0] ?? ""),
          lastName: String(responsible.lastName ?? responsible.last_name ?? responsibleNameParts.slice(1).join(" ")),
          dni: String(responsible.dni ?? ""),
          birthDate: String(responsible.birthDate ?? responsible.birth_date ?? responsible.birthdate ?? ""),
          email: String(responsible.email ?? ""),
          phone: String(responsible.phone ?? ""),
          address: String(responsible.address ?? ""),
          city: String(responsible.city ?? responsible.locality ?? "")
        },
      };
    });
  };

  useEffect(() => {
    if (!token) return;

    Promise.all([fetchTrips(token), fetchPassengers(token)])
      .then(([tripsPayload, passengersPayload]) => {
        const map: Record<number, string> = {};
        extractCollection<Record<string, unknown>>(tripsPayload).forEach((trip) => {
          if (!trip || typeof trip !== "object") return;
          const id = Number(trip.id);
          const destination = typeof trip.destination === "string" ? trip.destination.trim() : "";
          if (!Number.isFinite(id) || !destination) return;
          map[id] = destination;
        });

        setTripDestinations(map);
        const normalizedPassengers = normalizePassengers(passengersPayload);
        console.log("[Accounts] normalized GET /passengers", normalizedPassengers);
        setPassengers(normalizedPassengers);
        setError(null);
      })
      .catch((err) => {
        setPassengers([]);
        setError(err instanceof Error ? err.message : "No se pudieron cargar viajes o pasajeros.");
      });
  }, [token]);

  const schoolTabs = useMemo(() => {
    const schools = Array.from(new Set(passengers.map((passenger) => passenger.school_name))).sort((a, b) =>
      a.localeCompare(b, "es")
    );
    return ["all", ...schools];
  }, [passengers]);

  const tripOptions = useMemo(() => {
    const scoped = selectedSchool === "all"
      ? passengers
      : passengers.filter((passenger) => passenger.school_name === selectedSchool);

    const unique = new Map<number, string>();
    scoped.forEach((passenger) => {
      if (!unique.has(passenger.trip_id)) {
        unique.set(passenger.trip_id, passenger.trip_label);
      }
    });

    return Array.from(unique.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [passengers, selectedSchool]);


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
    const normalized = query.trim().toLowerCase();
    const hasQuery = normalized.length > 0;

    return passengers
      .filter((passenger) => {
        const isSchoolMatch = selectedSchool === "all" || passenger.school_name === selectedSchool;
        if (!isSchoolMatch) return false;
        if (!hasQuery && (!selectedTrip || passenger.trip_id !== Number(selectedTrip))) return false;
        if (!normalized) return selectedTrip ? passenger.trip_id === Number(selectedTrip) : true;
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
      {error ? <p className="form-error">{error}</p> : null}

      <div className="card form-grid">
        <div className="school-tabs">
          {schoolTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`tab-btn ${selectedSchool === tab ? "active" : ""}`}
              onClick={() => {
                setSelectedSchool(tab);
                setSelectedTrip("");
              }}
            >
              {tab === "all" ? "Todas las escuelas" : tab}
            </button>
          ))}
        </div>
        <label className="field">
          <span>Salida (viaje)</span>
          <select value={selectedTrip} onChange={(event) => setSelectedTrip(event.target.value)} required>
            <option value="">Seleccionar salida</option>
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
        {!selectedTrip && !query.trim() ? <p>Seleccioná una salida para ver estado de cuenta e imprimir chequeras.</p> : null}
        {(selectedTrip || query.trim()) && rows.length === 0 ? <p>No hay pasajeros para el filtro seleccionado.</p> : null}

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
