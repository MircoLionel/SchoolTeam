import { UserProfile } from "../types/auth";

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
  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

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

export async function fetchSchools(token: string) {
  return apiRequest<unknown>("/schools", { token });
}

export async function fetchGrades(token: string) {
  return apiRequest<unknown>("/grades", { token });
}

export async function fetchShifts(token: string) {
  return apiRequest<unknown>("/shifts", { token });
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
