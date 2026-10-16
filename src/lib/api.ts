import type {
  CreateExpenseInput,
  CreateTripInput,
  Member,
  Trip,
  TripSnapshot
} from "../types";

interface ApiErrorBody {
  error?: string;
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
    throw new Error(body.error || "请求失败，请稍后重试");
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

  createDemo() {
    return request<{ id: string; inviteCode: string }>("/api/demo", {
      method: "POST"
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
