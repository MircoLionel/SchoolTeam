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
}

export const PASSENGERS_STORAGE_KEY = "schoolteam.passengers.with-responsible";
export const CASH_INCOME_STORAGE_KEY = "schoolteam.cash.incomes";

export interface CashIncome {
  id: number;
  passengerId: number;
  passengerLabel: string;
  amount: number;
  createdAt: string;
  method: "coupon";
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
    paid_amount: paidAmount
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
