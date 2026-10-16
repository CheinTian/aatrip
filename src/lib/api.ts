import type {
  CreateExpenseInput,
  CreateTripInput,
  Member,
  Trip,
  TripSnapshot,
  VisitStats
} from "../types";
import type { Locale, TranslationKey } from "./i18n";

interface ApiErrorBody {
  error?: string;
  code?: string;
}

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export function getErrorMessage(
  cause: unknown,
  t: (key: TranslationKey) => string,
  fallbackKey: TranslationKey
) {
  if (cause instanceof ApiError && cause.code) {
    const key = `errors.${cause.code}` as TranslationKey;
    const translated = t(key);
    if (translated !== key) return translated;
  }
  if (cause instanceof Error && cause.message) return cause.message;
  return t(fallbackKey);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new ApiError(
      body.error || "Request failed",
      body.code || "request_failed",
      response.status
    );
  }

  return (await response.json()) as T;
}

export const api = {
  getTrip(id: string) {
    return request<TripSnapshot>(`/api/trips/${encodeURIComponent(id)}`);
  },

  createTrip(input: CreateTripInput) {
    return request<{ id: string; inviteCode: string }>("/api/trips", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },

  joinTrip(code: string) {
    return request<{ id: string }>("/api/trips/join", {
      method: "POST",
      body: JSON.stringify({ code })
    });
  },

  createDemo(locale: Locale) {
    return request<{ id: string; inviteCode: string }>("/api/demo", {
      method: "POST",
      body: JSON.stringify({ locale })
    });
  },

  recordVisit(visitorId: string) {
    return request<VisitStats>("/api/visits", {
      method: "POST",
      body: JSON.stringify({ visitorId })
    });
  },

  addMember(tripId: string, name: string) {
    return request<Member>(`/api/trips/${encodeURIComponent(tripId)}/members`, {
      method: "POST",
      body: JSON.stringify({ name })
    });
  },

  removeMember(tripId: string, memberId: string) {
    return request<{ ok: true }>(
      `/api/trips/${encodeURIComponent(tripId)}/members/${encodeURIComponent(memberId)}`,
      { method: "DELETE" }
    );
  },

  updateTrip(
    tripId: string,
    input: Partial<Omit<Trip, "id" | "inviteCode" | "createdAt">>
  ) {
    return request<Trip>(`/api/trips/${encodeURIComponent(tripId)}`, {
      method: "PUT",
      body: JSON.stringify(input)
    });
  },

  addExpense(tripId: string, input: CreateExpenseInput) {
    return request<{ id: string }>(
      `/api/trips/${encodeURIComponent(tripId)}/expenses`,
      {
        method: "POST",
        body: JSON.stringify(input)
      }
    );
  },

  removeExpense(tripId: string, expenseId: string) {
    return request<{ ok: true }>(
      `/api/trips/${encodeURIComponent(tripId)}/expenses/${encodeURIComponent(expenseId)}`,
      { method: "DELETE" }
    );
  }
};
