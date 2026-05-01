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
  trip_destination?: string;
  trip_contract_number?: string;
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
  last_modified_action?: "create" | "update" | "payment" | "price_update" | "delete";
  checkbook_id?: number;
  checkbook_status?: string | null;
  checkbook_printed_at?: string | null;
  checkbook_printed_by?: string | null;
}

export const PASSENGERS_STORAGE_KEY = "schoolteam.passengers.with-responsible";
export const CASH_INCOME_STORAGE_KEY = "schoolteam.cash.incomes";
export const PASSENGER_AUDIT_STORAGE_KEY = "schoolteam.passengers.audit";
export const CASHBOX_CATEGORY_STORAGE_KEY = "schoolteam.cashbox.categories";
export const CASHBOX_EXPENSE_STORAGE_KEY = "schoolteam.cashbox.expenses";
export const CASHBOX_AUDIT_STORAGE_KEY = "schoolteam.cashbox.audit";

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
  action: "create" | "update" | "payment" | "price_update" | "delete";
  actorName: string;
  actorRole: string;
  createdAt: string;
  detail?: string;
}

export interface CashboxCategory {
  id: number;
  label: string;
  color: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface CashboxExpense {
  id: number;
  categoryId: number;
  description: string;
  amount: number;
  createdAt: string;
  createdBy: string;
}

export interface CashboxAuditEntry {
  id: number;
  action: "create_category" | "update_category" | "add_expense" | "edit_expense" | "reset_cashbox";
  actorName: string;
  createdAt: string;
  detail: string;
}

const defaultCashboxCategories: CashboxCategory[] = [
  { id: 1, label: "Sueldos", color: "#6b7280", createdAt: new Date(0).toISOString(), createdBy: "Sistema" },
  { id: 2, label: "Combustible", color: "#2563eb", createdAt: new Date(0).toISOString(), createdBy: "Sistema" },
  { id: 3, label: "Mantenimiento", color: "#16a34a", createdAt: new Date(0).toISOString(), createdBy: "Sistema" },
  { id: 4, label: "Seguros", color: "#a855f7", createdAt: new Date(0).toISOString(), createdBy: "Sistema" },
  { id: 5, label: "Administración", color: "#f97316", createdAt: new Date(0).toISOString(), createdBy: "Sistema" },
];

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

export function resetCashIncomes() {
  localStorage.setItem(CASH_INCOME_STORAGE_KEY, JSON.stringify([]));
}

export function readCashboxCategories(): CashboxCategory[] {
  const raw = localStorage.getItem(CASHBOX_CATEGORY_STORAGE_KEY);
  if (!raw) return defaultCashboxCategories;
  try {
    const parsed = JSON.parse(raw) as CashboxCategory[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultCashboxCategories;
  } catch {
    return defaultCashboxCategories;
  }
}

export function saveCashboxCategories(next: CashboxCategory[]) {
  localStorage.setItem(CASHBOX_CATEGORY_STORAGE_KEY, JSON.stringify(next));
}

export function readCashboxExpenses(): CashboxExpense[] {
  const raw = localStorage.getItem(CASHBOX_EXPENSE_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CashboxExpense[];
  } catch {
    return [];
  }
}

export function appendCashboxExpense(expense: CashboxExpense) {
  const current = readCashboxExpenses();
  localStorage.setItem(CASHBOX_EXPENSE_STORAGE_KEY, JSON.stringify([expense, ...current]));
}

export function saveCashboxExpenses(next: CashboxExpense[]) {
  localStorage.setItem(CASHBOX_EXPENSE_STORAGE_KEY, JSON.stringify(next));
}

export function readCashboxAudit(): CashboxAuditEntry[] {
  const raw = localStorage.getItem(CASHBOX_AUDIT_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as CashboxAuditEntry[];
  } catch {
    return [];
  }
}

export function appendCashboxAudit(entry: CashboxAuditEntry) {
  const current = readCashboxAudit();
  localStorage.setItem(CASHBOX_AUDIT_STORAGE_KEY, JSON.stringify([entry, ...current]));
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
