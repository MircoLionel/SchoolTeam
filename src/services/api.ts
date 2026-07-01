import { UserProfile } from "../types/auth";
import { Role } from "../types/auth";

export interface School {
  id: number;
  name: string;
  locality: string | null;
  address: string | null;
}

export interface Grade {
  id: number;
  name: string;
}

export interface Shift {
  id: number;
  name: string;
}

export interface PassengerType {
  id: number;
  name: string;
  percentage: number;
}

export interface CreateTripPayload {
  school_id: number;
  grade_id: number;
  contract_number: string;
  destination: string;
  group_name: string;
  year: number;
  status?: string;
}

export interface CreateBudgetPayload {
  trip_id: number;
  base_price_100: number;
  suggested_installments: number;
  version: number;
  status?: string;
  pdf_path?: string;
}

export interface SchoolGradeShift {
  id: number;
  school_id: number;
  grade_id: number;
  shift_id: number;
  route: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  password_recovery?: string | null;
  created_at?: string;
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, headers, ...rest } = options;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
  } catch (error) {
    throw new Error(
      "No se pudo conectar con el backend. Revisá la URL, el servidor y la conexión."
    );
  }

  if (!response.ok) {
    let message = "Ocurrió un error inesperado.";
    try {
      const data = (await response.json()) as ApiErrorResponse;
      message = data.message ?? data.error ?? message;
    } catch (error) {
      // ignore parse errors
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function login(email: string, password: string) {
  return apiRequest<{ token: string; user: UserProfile }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function logout(token: string) {
  return apiRequest<{ message: string }>("/auth/logout", {
    method: "POST",
    token
  });
}

export async function fetchMe(token: string) {
  return apiRequest<UserProfile>("/me", { token });
}

export async function fetchTrips(token: string) {
  return apiRequest<unknown>("/trips", { token });
}

export async function createTrip(token: string, payload: CreateTripPayload) {
  return apiRequest<unknown>("/trips", {
    method: "POST",
    token,
    body: JSON.stringify(payload)
  });
}

export async function fetchBudgets(token: string) {
  return apiRequest<unknown>("/budgets", { token });
}

export async function createBudget(token: string, payload: CreateBudgetPayload) {
  return apiRequest<unknown>("/budgets", {
    method: "POST",
    token,
    body: JSON.stringify(payload)
  });
}

export async function updateBudget(token: string, id: number, payload: Partial<CreateBudgetPayload>) {
  return apiRequest<unknown>(`/budgets/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload)
  });
}

export interface DashboardSummary {
  total_trips: number;
  total_passengers: number;
  total_audit_events: number;
}

export interface PassengerSearchRecord {
  id: number;
  full_name: string;
  dni: string;
  school: { id: number; name: string } | null;
  trip: { id: number; group_name: string | null; destination: string | null } | null;
  paid_amount: number;
  balance: number;
}

export async function fetchDashboardSummary(token: string) {
  return apiRequest<DashboardSummary>("/dashboard/summary", { token });
}

export async function fetchPassengers(
  token: string,
  params: { page?: number; per_page?: number; search?: string; school_id?: number; trip_id?: number } = {}
) {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.per_page) query.set("per_page", String(params.per_page));
  if (params.search) query.set("search", params.search);
  if (params.school_id) query.set("school_id", String(params.school_id));
  if (params.trip_id) query.set("trip_id", String(params.trip_id));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<unknown>(`/passengers${suffix}`, { token });
}

export async function searchPassengers(
  token: string,
  params: { q?: string; school_id?: number; trip_id?: number; limit?: number } = {}
) {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.school_id) query.set("school_id", String(params.school_id));
  if (params.trip_id) query.set("trip_id", String(params.trip_id));
  if (params.limit) query.set("limit", String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<PassengerSearchRecord[]>(`/passengers/search${suffix}`, { token });
}

export interface CreatePassengerPayload {
  school_id: number;
  trip_id: number;
  shift_id: number;
  grade_id?: number;
  grade_shift_id?: number;
  passenger_type_id?: number;
  passenger_name: string;
  passenger_last_name: string;
  passenger_dni: string;
  passenger_birth_date: string;
  is_adult_companion: boolean;
  has_special_price: boolean;
  trip_value: number;
  num_installments: number;
  installments: number[];
  responsible: {
    name: string;
    last_name: string;
    dni: string;
    birth_date: string;
    email: string;
    phone: string;
    address: string;
    city: string;
  };
  full_name?: string;
  dni?: string;
  birthdate?: string;
}

export async function createPassenger(token: string, payload: CreatePassengerPayload) {
  return apiRequest<unknown>("/passengers", {
    method: "POST",
    token,
    body: JSON.stringify(payload)
  });
}

export async function updatePassenger(token: string, id: number, payload: Partial<CreatePassengerPayload>) {
  return apiRequest<unknown>(`/passengers/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload)
  });
}

export async function deletePassenger(token: string, id: number) {
  return apiRequest<{ message: string }>(`/passengers/${id}`, {
    method: "DELETE",
    token,
  });
}

export async function fetchAudit(token: string) {
  return apiRequest<unknown>("/audit", { token });
}

export async function fetchUsers(token: string) {
  return apiRequest<AdminUser[]>("/users", { token });
}

export async function updateUserPermissions(
  token: string,
  userId: number,
  payload: Pick<AdminUser, "role" | "is_active">
) {
  return apiRequest<AdminUser>(`/users/${userId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(payload)
  });
}

export async function createUser(
  token: string,
  payload: {
    name: string;
    email: string;
    password: string;
    role: Role;
    is_active: boolean;
  }
) {
  return apiRequest<AdminUser>("/users", {
    method: "POST",
    token,
    body: JSON.stringify(payload)
  });
}

export async function fetchSchools(token: string) {
  return apiRequest<School[]>("/schools", { token });
}

export async function createSchool(
  token: string,
  payload: Pick<School, "name" | "locality" | "address">
) {
  return apiRequest<School>("/schools", {
    method: "POST",
    token,
    body: JSON.stringify(payload)
  });
}

export async function deleteSchool(token: string, id: number) {
  return apiRequest<{ message: string }>(`/schools/${id}`, {
    method: "DELETE",
    token
  });
}

export async function fetchGrades(token: string) {
  return apiRequest<Grade[]>("/grades", { token });
}

export async function createGrade(token: string, payload: Pick<Grade, "name">) {
  return apiRequest<Grade>("/grades", {
    method: "POST",
    token,
    body: JSON.stringify(payload)
  });
}

export async function deleteGrade(token: string, id: number) {
  return apiRequest<{ message: string }>(`/grades/${id}`, {
    method: "DELETE",
    token
  });
}

export async function fetchShifts(token: string) {
  return apiRequest<Shift[]>("/shifts", { token });
}

export async function createShift(token: string, payload: Pick<Shift, "name">) {
  return apiRequest<Shift>("/shifts", {
    method: "POST",
    token,
    body: JSON.stringify(payload)
  });
}

export async function deleteShift(token: string, id: number) {
  return apiRequest<{ message: string }>(`/shifts/${id}`, {
    method: "DELETE",
    token
  });
}

export async function fetchPassengerTypes(token: string) {
  return apiRequest<PassengerType[]>("/passenger-types", { token });
}

export async function createPassengerType(
  token: string,
  payload: Pick<PassengerType, "name" | "percentage">
) {
  return apiRequest<PassengerType>("/passenger-types", {
    method: "POST",
    token,
    body: JSON.stringify(payload)
  });
}

export async function deletePassengerType(token: string, id: number) {
  return apiRequest<{ message: string }>(`/passenger-types/${id}`, {
    method: "DELETE",
    token
  });
}

export async function fetchSchoolGradeShifts(token: string) {
  return apiRequest<SchoolGradeShift[]>("/school-grade-shifts", { token });
}

export async function createSchoolGradeShift(
  token: string,
  payload: Omit<SchoolGradeShift, "id">
) {
  return apiRequest<SchoolGradeShift>("/school-grade-shifts", {
    method: "POST",
    token,
    body: JSON.stringify(payload)
  });
}

export async function deleteSchoolGradeShift(token: string, id: number) {
  return apiRequest<{ message: string }>(`/school-grade-shifts/${id}`, {
    method: "DELETE",
    token
  });
}



export interface CashMovementRecord {
  id: number;
  date: string;
  type: "INCOME" | "EXPENSE" | string;
  amount: number;
  method?: string | null;
  cash_box?: "CASH" | "BANK" | string | null;
  detail?: string | null;
  category_id?: number;
  category_name?: string | null;
  payment_id?: number;
  created_at?: string;
}

export interface CashCategoryRecord {
  id: number;
  name: string;
}

export interface CashMovementSummary {
  incomes_cash: number;
  incomes_bank: number;
  expenses_cash: number;
  expenses_bank: number;
  total_incomes: number;
  total_expenses: number;
  balance: number;
  categories: Array<{
    category_id: number;
    category_name: string;
    amount: number;
  }>;
}

export interface CashMovementListResponse {
  data: CashMovementRecord[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    has_more: boolean;
    all: boolean;
  };
  summary: CashMovementSummary;
}

export interface PassengerPaymentRecord {
  id: number;
  payment_date: string;
  amount: number;
  method: string;
  cash_box: "CASH" | "BANK" | string;
  user_name: string;
  school_name: string;
  trip_name: string;
  trip_destination?: string;
  passenger_name: string;
  detail?: string | null;
}

export interface PaymentReportRecord {
  id: number;
  date: string;
  amount: number;
  method: string;
  cash_box: "CASH" | "BANK" | string;
  user_id: number;
  user_name: string;
  school_name: string;
  trip_name: string;
  trip_destination?: string;
  passenger_name: string;
}

export async function registerCouponCollectPayment(
  token: string,
  payload: { passenger_id: number; trip_id?: number; amount: number; reason?: string; detail?: string; payment_method?: string; collected_by?: number; payment_date?: string }
) {
  return apiRequest<{ payment: { id: number } }>("/payments/coupon-collect", {
    method: "POST",
    token,
    body: JSON.stringify(payload)
  });
}

export async function registerNonCashPayment(
  token: string,
  payload: { passenger_id: number; trip_id?: number; amount: number; method?: "TRANSFER" | "BANK"; reference?: string; detail?: string; date?: string; payment_date?: string }
) {
  return apiRequest<{ payment: { id: number } }>("/payments/non-cash", {
    method: "POST",
    token,
    body: JSON.stringify(payload)
  });
}

export async function fetchPassengerPayments(token: string, passengerId: number) {
  return apiRequest<PassengerPaymentRecord[]>(`/passengers/${passengerId}/payments`, { token });
}

export async function fetchPaymentsReport(
  token: string,
  params: { date_from?: string; date_to?: string; user_id?: number; cash_box?: "CASH" | "BANK" | "ALL" }
) {
  const query = new URLSearchParams();
  if (params.date_from) query.set("date_from", params.date_from);
  if (params.date_to) query.set("date_to", params.date_to);
  if (params.user_id) query.set("user_id", String(params.user_id));
  if (params.cash_box) query.set("cash_box", params.cash_box);
  return apiRequest<PaymentReportRecord[]>(`/payments/report?${query.toString()}`, { token });
}

export async function deletePayment(token: string, paymentId: number) {
  return apiRequest<{ message: string }>(`/payments/${paymentId}`, {
    method: "DELETE",
    token
  });
}

export async function fetchCashMovements(
  token: string,
  params: { category_id?: number; cash_box?: "CASH" | "BANK" | "ALL"; date_from?: string; date_to?: string; page?: number; per_page?: number; all?: boolean } = {}
) {
  const query = new URLSearchParams();
  if (params.category_id) query.set("category_id", String(params.category_id));
  if (params.cash_box && params.cash_box !== "ALL") query.set("cash_box", params.cash_box);
  if (params.date_from) query.set("date_from", params.date_from);
  if (params.date_to) query.set("date_to", params.date_to);
  if (params.page) query.set("page", String(params.page));
  if (params.per_page) query.set("per_page", String(params.per_page));
  if (params.all) query.set("all", "1");
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<CashMovementListResponse>(`/cash-movements${suffix}`, { token });
}

export async function fetchCashCategories(token: string) {
  return apiRequest<CashCategoryRecord[]>("/cash-categories", { token });
}

export async function createCashExpense(
  token: string,
  payload: { amount: number; description?: string; category_name?: string; cash_box?: "CASH" | "BANK" }
) {
  return apiRequest<{ movement: CashMovementRecord }>("/cash-movements/expense", {
    method: "POST",
    token,
    body: JSON.stringify(payload)
  });
}

export async function deleteCashExpense(token: string, movementId: number) {
  return apiRequest<{ message: string }>(`/cash-movements/${movementId}`, {
    method: "DELETE",
    token,
  });
}

export async function resetCashboxRecords(token: string) {
  return apiRequest<{ message: string }>("/cash-movements", {
    method: "DELETE",
    token,
  });
}
export interface CheckbookPdfInstallmentPayload {
  nro_cuota: string;
  importe: number;
}

export interface CheckbookPdfPayload {
  header: {
    contrato?: string;
    grupo?: string;
    destino?: string;
    padre_tutor?: string;
    pax?: string;
    dni?: string;
    periodo?: string;
  };
  installments: CheckbookPdfInstallmentPayload[];
  code?: string;
}

export async function renderCheckbookPdf(token: string, payload: CheckbookPdfPayload): Promise<Blob> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/checkbooks/render-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    throw new Error("No se pudo conectar con el backend para generar la chequera.");
  }

  if (!response.ok) {
    let message = "No se pudo generar la chequera.";
    try {
      const data = (await response.json()) as ApiErrorResponse;
      message = data.error ?? data.message ?? message;
    } catch (error) {
      // ignore parse errors
    }
    throw new Error(message);
  }

  return response.blob();
}

export async function markCheckbookPrinted(
  token: string,
  payload: { passenger_id: number; checkbook_id?: number }
) {
  return apiRequest<{
    id: number;
    passenger_id: number;
    status: string;
    printed_at: string | null;
    printed_by: string | null;
    printed_by_user_id: number | null;
  }>("/checkbooks/mark-printed", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}



export async function markCheckbooksPrintedBulk(
  token: string,
  payload: { passenger_ids: number[] }
) {
  return apiRequest<{
    updated: number;
    records: Array<{
      id: number;
      passenger_id: number;
      status: string;
      printed_at: string | null;
      printed_by: string | null;
      printed_by_user_id: number | null;
    }>;
  }>("/checkbooks/mark-printed-bulk", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}
export function extractCount(payload: unknown): number | null {
  if (!payload) {
    return null;
  }

  if (Array.isArray(payload)) {
    return payload.length;
  }

  if (typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (typeof record.total === "number") {
      return record.total;
    }
    if (Array.isArray(record.data)) {
      return record.data.length;
    }
  }

  return null;
}

export function extractCollection<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.data)) {
    return record.data as T[];
  }

  if (record.data && typeof record.data === "object") {
    const nested = record.data as Record<string, unknown>;
    if (Array.isArray(nested.data)) {
      return nested.data as T[];
    }
  }

  return [];
}
