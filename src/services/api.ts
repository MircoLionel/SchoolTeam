import { UserProfile } from "../types/auth";

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

export async function fetchBudgets(token: string) {
  return apiRequest<unknown>("/budgets", { token });
}

export async function fetchPassengers(token: string) {
  return apiRequest<unknown>("/passengers", { token });
}

export async function fetchAudit(token: string) {
  return apiRequest<unknown>("/audit", { token });
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
