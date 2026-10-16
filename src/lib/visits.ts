import { api } from "./api";
import type { VisitStats } from "../types";

const VISITOR_KEY = "aatrip:visitor";
const VISITOR_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let pending: Promise<VisitStats> | null = null;

function randomVisitorId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20)
  ].join("-");
}

/**
 * Anonymous, browser-local identifier. It is only used to tell repeat visits
 * apart from new ones, so no personal data leaves the device.
 */
export function visitorId() {
  let stored = "";
  try {
    stored = localStorage.getItem(VISITOR_KEY) ?? "";
  } catch {
    // Storage can be blocked; a per-session id is used instead.
  }

  if (!VISITOR_PATTERN.test(stored)) {
    stored = randomVisitorId();
    try {
      localStorage.setItem(VISITOR_KEY, stored);
    } catch {
      // The counter still works without persistence.
    }
  }

  return stored;
}

/**
 * Counts one page view and returns the site totals. The in-flight request is
 * shared so the app and the footer counter never count the same load twice.
 */
export function recordVisit() {
  if (!pending) {
    pending = api.recordVisit(visitorId()).catch((cause) => {
      pending = null;
      throw cause;
    });
  }
  return pending;
}
