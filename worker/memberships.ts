import type { AuthUser, UserTrip } from "../src/types";

interface UserTripRow {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  currency: string;
  invite_code: string;
  role: "owner" | "member";
  joined_at: string;
  member_count: number;
  expense_count: number;
  total_cents: number;
  last_activity_at: string;
}

const MEMBER_COLORS = [
  "#F05A36",
  "#1D8F78",
  "#E2A426",
  "#3D72C7",
  "#9D5BC2",
  "#D84C72",
  "#47745A",
  "#C56A2D"
];

export async function ensureOwnerMembership(
  db: D1Database,
  tripId: string,
  userId: string,
  memberId: string
) {
  await db
    .prepare(
      `INSERT INTO trip_memberships
       (trip_id, user_id, role, member_id, joined_at)
       VALUES (?, ?, 'owner', ?, ?)
       ON CONFLICT(trip_id, user_id) DO UPDATE SET
         role = 'owner',
         member_id = COALESCE(trip_memberships.member_id, excluded.member_id)`
    )
    .bind(tripId, userId, memberId, new Date().toISOString())
    .run();
}

export async function ensureJoinMembership(
  db: D1Database,
  tripId: string,
  user: AuthUser
) {
  const existing = await db
    .prepare(
      "SELECT member_id FROM trip_memberships WHERE trip_id = ? AND user_id = ?"
    )
    .bind(tripId, user.id)
    .first<{ member_id: string | null }>();
  if (existing) return;

  const displayName = user.name.trim().slice(0, 16) || "Traveler";
  let memberId =
    (
      await db
        .prepare(
          `SELECT id FROM members
           WHERE trip_id = ? AND lower(name) = lower(?)
           ORDER BY created_at ASC
           LIMIT 1`
        )
        .bind(tripId, displayName)
        .first<{ id: string }>()
    )?.id ?? "";

  if (!memberId) {
    const count = await db
      .prepare("SELECT COUNT(*) AS count FROM members WHERE trip_id = ?")
      .bind(tripId)
      .first<{ count: number }>();
    const memberCount = Number(count?.count ?? 0);
    if (memberCount < 16) {
      memberId = crypto.randomUUID();
      await db
        .prepare(
          `INSERT INTO members (id, trip_id, name, color, created_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(
          memberId,
          tripId,
          displayName,
          MEMBER_COLORS[memberCount % MEMBER_COLORS.length],
          new Date().toISOString()
        )
        .run();
    }
  }

  await db
    .prepare(
      `INSERT INTO trip_memberships
       (trip_id, user_id, role, member_id, joined_at)
       VALUES (?, ?, 'member', ?, ?)
       ON CONFLICT(trip_id, user_id) DO NOTHING`
    )
    .bind(tripId, user.id, memberId || null, new Date().toISOString())
    .run();
}

export async function listUserTrips(
  db: D1Database,
  userId: string
): Promise<UserTrip[]> {
  const result = await db
    .prepare(
      `SELECT
         t.id,
         t.name,
         t.destination,
         t.start_date,
         t.end_date,
         t.currency,
         t.invite_code,
         m.role,
         m.joined_at,
         (SELECT COUNT(*) FROM members WHERE trip_id = t.id) AS member_count,
         (SELECT COUNT(*) FROM expenses WHERE trip_id = t.id) AS expense_count,
         (SELECT COALESCE(SUM(amount_cents), 0) FROM expenses WHERE trip_id = t.id)
           AS total_cents,
         COALESCE(
           (SELECT MAX(created_at) FROM expenses WHERE trip_id = t.id),
           t.created_at
         ) AS last_activity_at
       FROM trip_memberships m
       JOIN trips t ON t.id = m.trip_id
       WHERE m.user_id = ?
       ORDER BY last_activity_at DESC`
    )
    .bind(userId)
    .all<UserTripRow>();

  return (result.results ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    destination: row.destination,
    startDate: row.start_date || "",
    endDate: row.end_date || "",
    currency: row.currency,
    inviteCode: row.invite_code,
    role: row.role,
    joinedAt: row.joined_at,
    memberCount: Number(row.member_count),
    expenseCount: Number(row.expense_count),
    totalCents: Number(row.total_cents),
    lastActivityAt: row.last_activity_at
  }));
}

export async function leaveTrip(
  db: D1Database,
  tripId: string,
  userId: string
) {
  const membership = await db
    .prepare(
      "SELECT role FROM trip_memberships WHERE trip_id = ? AND user_id = ?"
    )
    .bind(tripId, userId)
    .first<{ role: "owner" | "member" }>();
  if (!membership) return false;

  await db
    .prepare("DELETE FROM trip_memberships WHERE trip_id = ? AND user_id = ?")
    .bind(tripId, userId)
    .run();

  if (membership.role === "owner") {
    const successor = await db
      .prepare(
        `SELECT user_id FROM trip_memberships
         WHERE trip_id = ?
         ORDER BY joined_at ASC
         LIMIT 1`
      )
      .bind(tripId)
      .first<{ user_id: string }>();
    if (successor) {
      await db
        .prepare(
          `UPDATE trip_memberships SET role = 'owner'
           WHERE trip_id = ? AND user_id = ?`
        )
        .bind(tripId, successor.user_id)
        .run();
    }
  }

  return true;
}
