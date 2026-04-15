export interface Responsible {
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
  isAdultCompanion: boolean;
  hasSpecialPrice: boolean;
  trip_value: number;
  paid_amount: number;
  num_installments: number;
  installments: number[];
  responsible: Responsible;
  created_by?: string;
  created_at?: string;
  last_modified_by?: string;
  last_modified_at?: string;
  last_modified_action?: "create" | "update" | "payment" | "price_update";
}

export const PASSENGERS_STORAGE_KEY = "schoolteam.passengers.with-responsible";
export const CASH_INCOME_STORAGE_KEY = "schoolteam.cash.incomes";
export const PASSENGER_AUDIT_STORAGE_KEY = "schoolteam.passengers.audit";

export interface CashIncome {
  id: number;
  passengerId: number;
  passengerLabel: string;
  amount: number;
  createdAt: string;
  method: "coupon";
}

export interface PassengerAuditEntry {
  id: number;
  passengerId: number;
  passengerLabel: string;
  action: "create" | "update" | "payment" | "price_update";
  actorName: string;
  actorRole: string;
  createdAt: string;
  detail?: string;
}

function normalizePassenger(item: PassengerItem): PassengerItem {
  const numInstallments = item.num_installments ?? 8;
  const installments = Array.isArray(item.installments)
    ? Array.from({ length: numInstallments }, (_, index) => Number(item.installments[index] ?? 0))
    : Array.from({ length: numInstallments }, () => 0);

  const paidAmount = Number(item.paid_amount ?? 0);

  return {
    ...item,
    num_installments: numInstallments,
    installments,
    paid_amount: paidAmount,
    created_by: item.created_by ?? "Sistema",
    created_at: item.created_at ?? item.last_modified_at ?? new Date().toISOString(),
    last_modified_by: item.last_modified_by ?? item.created_by ?? "Sistema",
    last_modified_at: item.last_modified_at ?? item.created_at ?? new Date().toISOString(),
    last_modified_action: item.last_modified_action ?? "create"
  };
}

export function readStoredPassengers(): PassengerItem[] {
  const raw = localStorage.getItem(PASSENGERS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as PassengerItem[];
    return parsed.map(normalizePassenger);
  } catch {
    return [];
  }
}

export function saveStoredPassengers(next: PassengerItem[]) {
  localStorage.setItem(PASSENGERS_STORAGE_KEY, JSON.stringify(next));
}

export function updatePassengerById(id: number, updater: (item: PassengerItem) => PassengerItem) {
  const current = readStoredPassengers();
  const next = current.map((item) => (item.id === id ? normalizePassenger(updater(item)) : item));
  saveStoredPassengers(next);
  return next;
}

export function readCashIncomes(): CashIncome[] {
  const raw = localStorage.getItem(CASH_INCOME_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CashIncome[];
  } catch {
    return [];
  }
}

export function appendCashIncome(income: CashIncome) {
  const current = readCashIncomes();
  localStorage.setItem(CASH_INCOME_STORAGE_KEY, JSON.stringify([income, ...current]));
}

export function getPassengerBalance(item: PassengerItem): number {
  return item.paid_amount - item.trip_value;
}

export function readPassengerAudit(): PassengerAuditEntry[] {
  const raw = localStorage.getItem(PASSENGER_AUDIT_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PassengerAuditEntry[];
  } catch {
    return [];
  }
}

export function appendPassengerAudit(entry: PassengerAuditEntry) {
  const current = readPassengerAudit();
  localStorage.setItem(PASSENGER_AUDIT_STORAGE_KEY, JSON.stringify([entry, ...current]));
}
