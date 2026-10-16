import type {
  Balance,
  CreateExpenseInput,
  CreateTripInput,
  Expense,
  ExpenseShare,
  Member,
  Settlement,
  SplitMode,
  Trip,
  TripSnapshot
} from "../src/types";

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

interface TripRow {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  currency: string;
  invite_code: string;
  created_at: string;
}

interface MemberRow {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

interface ExpenseRow {
  id: string;
  trip_id: string;
  title: string;
  amount_cents: number;
  category: string;
  paid_by: string;
  expense_date: string;
  notes: string;
  split_mode: SplitMode;
  created_at: string;
}

interface ShareRow {
  expense_id: string;
  member_id: string;
  amount_cents: number;
}

const COLORS = [
  "#F05A36",
  "#1D8F78",
  "#E2A426",
  "#3D72C7",
  "#9D5BC2",
  "#D84C72",
  "#47745A",
  "#C56A2D"
];

const CURRENCIES = new Set([
  "CNY",
  "USD",
  "EUR",
  "JPY",
  "THB",
  "SGD",
  "HKD",
  "KRW",
  "GBP",
  "AUD",
  "MYR",
  "TWD"
]);

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS
  });
}

function error(
  message: string,
  status = 400,
  code = "request_failed"
) {
  return json({ error: message, code }, status);
}

class ApiFailure extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "ApiFailure";
    this.code = code;
    this.status = status;
  }
}

function errorFrom(
  cause: unknown,
  fallbackMessage: string,
  fallbackCode: string,
  fallbackStatus = 400
) {
  if (cause instanceof ApiFailure) {
    return error(cause.message, cause.status, cause.code);
  }
  return error(fallbackMessage, fallbackStatus, fallbackCode);
}

function uid() {
  return crypto.randomUUID();
}

function inviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function validDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : "";
}

function toTrip(row: TripRow): Trip {
  return {
    id: row.id,
    name: row.name,
    destination: row.destination,
    startDate: row.start_date || "",
    endDate: row.end_date || "",
    currency: row.currency,
    inviteCode: row.invite_code,
    createdAt: row.created_at
  };
}

function toMember(row: MemberRow): Member {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at
  };
}

function toExpense(row: ExpenseRow, shares: ExpenseShare[]): Expense {
  return {
    id: row.id,
    tripId: row.trip_id,
    title: row.title,
    amountCents: Number(row.amount_cents),
    category: row.category,
    paidBy: row.paid_by,
    date: row.expense_date,
    notes: row.notes,
    splitMode: row.split_mode,
    createdAt: row.created_at,
    shares
  };
}

function calculateBalances(
  members: Member[],
  expenses: Expense[]
): { balances: Balance[]; settlements: Settlement[] } {
  const totals = new Map(
    members.map((member) => [
      member.id,
      { paidCents: 0, owedCents: 0 }
    ])
  );

  for (const expense of expenses) {
    const paid = totals.get(expense.paidBy);
    if (paid) paid.paidCents += expense.amountCents;

    for (const share of expense.shares) {
      const owed = totals.get(share.memberId);
      if (owed) owed.owedCents += share.amountCents;
    }
  }

  const balances = members.map((member) => {
    const total = totals.get(member.id) ?? { paidCents: 0, owedCents: 0 };
    return {
      memberId: member.id,
      name: member.name,
      color: member.color,
      paidCents: total.paidCents,
      owedCents: total.owedCents,
      netCents: total.paidCents - total.owedCents
    };
  });

  const creditors = balances
    .filter((balance) => balance.netCents > 0)
    .map((balance) => ({ ...balance }))
    .sort((a, b) => b.netCents - a.netCents);
  const debtors = balances
    .filter((balance) => balance.netCents < 0)
    .map((balance) => ({ ...balance }))
    .sort((a, b) => a.netCents - b.netCents);
  const settlements: Settlement[] = [];

  let creditorIndex = 0;
  let debtorIndex = 0;
  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amountCents = Math.min(creditor.netCents, Math.abs(debtor.netCents));

    if (amountCents > 0) {
      settlements.push({
        fromMemberId: debtor.memberId,
        fromName: debtor.name,
        toMemberId: creditor.memberId,
        toName: creditor.name,
        amountCents
      });
    }

    creditor.netCents -= amountCents;
    debtor.netCents += amountCents;
    if (creditor.netCents === 0) creditorIndex += 1;
    if (debtor.netCents === 0) debtorIndex += 1;
  }

  return { balances, settlements };
}

function divideEqually(amountCents: number, memberIds: string[]): ExpenseShare[] {
  const base = Math.floor(amountCents / memberIds.length);
  let remainder = amountCents - base * memberIds.length;
  return memberIds.map((memberId) => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    return { memberId, amountCents: base + extra };
  });
}

async function getSnapshot(
  db: D1Database,
  tripId: string
): Promise<TripSnapshot | null> {
  const tripRow = await db
    .prepare("SELECT * FROM trips WHERE id = ?")
    .bind(tripId)
    .first<TripRow>();

  if (!tripRow) return null;

  const [membersResult, expensesResult, sharesResult] = await db.batch([
    db
      .prepare(
        "SELECT id, name, color, created_at FROM members WHERE trip_id = ? ORDER BY created_at ASC"
      )
      .bind(tripId),
    db
      .prepare(
        "SELECT * FROM expenses WHERE trip_id = ? ORDER BY expense_date DESC, created_at DESC"
      )
      .bind(tripId),
    db
      .prepare(
        `SELECT s.expense_id, s.member_id, s.amount_cents
         FROM expense_shares s
         JOIN expenses e ON e.id = s.expense_id
         WHERE e.trip_id = ?`
      )
      .bind(tripId)
  ]);

  const memberRows = (membersResult.results ?? []) as unknown as MemberRow[];
  const expenseRows = (expensesResult.results ?? []) as unknown as ExpenseRow[];
  const shareRows = (sharesResult.results ?? []) as unknown as ShareRow[];
  const members = memberRows.map(toMember);
  const sharesByExpense = new Map<string, ExpenseShare[]>();

  for (const share of shareRows) {
    const shares = sharesByExpense.get(share.expense_id) ?? [];
    shares.push({
      memberId: share.member_id,
      amountCents: Number(share.amount_cents)
    });
    sharesByExpense.set(share.expense_id, shares);
  }

  const expenses = expenseRows.map((row) =>
    toExpense(row, sharesByExpense.get(row.id) ?? [])
  );
  const { balances, settlements } = calculateBalances(members, expenses);
  const totalCents = expenses.reduce(
    (total, expense) => total + expense.amountCents,
    0
  );
  const categoryTotals = new Map<string, number>();
  for (const expense of expenses) {
    categoryTotals.set(
      expense.category,
      (categoryTotals.get(expense.category) ?? 0) + expense.amountCents
    );
  }
  const topCategory =
    [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "暂无";

  return {
    trip: toTrip(tripRow),
    members,
    expenses,
    balances,
    settlements,
    summary: {
      totalCents,
      expenseCount: expenses.length,
      perPersonCents:
        members.length > 0 ? Math.round(totalCents / members.length) : 0,
      topCategory
    }
  };
}

async function createTripCore(
  db: D1Database,
  input: CreateTripInput
): Promise<{ id: string; inviteCode: string }> {
  const name = cleanText(input.name, 40);
  const destination = cleanText(input.destination, 40);
  const currency = CURRENCIES.has(String(input.currency).toUpperCase())
    ? String(input.currency).toUpperCase()
    : "CNY";
  const memberNames = Array.isArray(input.members)
    ? input.members
        .map((member) => cleanText(member, 16))
        .filter(Boolean)
        .slice(0, 16)
    : [];

  if (!name) {
    throw new ApiFailure("trip_name_required", "请填写行程名称");
  }
  if (memberNames.length === 0) {
    throw new ApiFailure("members_required", "至少添加一位同行成员");
  }

  const id = uid();
  const code = inviteCode();
  const createdAt = new Date().toISOString();
  const statements = [
    db
      .prepare(
        `INSERT INTO trips
         (id, name, destination, start_date, end_date, currency, invite_code, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        name,
        destination,
        validDate(input.startDate),
        validDate(input.endDate),
        currency,
        code,
        createdAt
      ),
    ...memberNames.map((memberName, index) =>
      db
        .prepare(
          `INSERT INTO members (id, trip_id, name, color, created_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(
          uid(),
          id,
          memberName,
          COLORS[index % COLORS.length],
          new Date(Date.now() + index).toISOString()
        )
    )
  ];

  await db.batch(statements);
  return { id, inviteCode: code };
}

async function createExpenseCore(
  db: D1Database,
  tripId: string,
  input: CreateExpenseInput
) {
  const title = cleanText(input.title, 50);
  const amountCents = Math.round(Number(input.amountCents));
  const category = cleanText(input.category, 12) || "其他";
  const paidBy = cleanText(input.paidBy, 64);
  const date = validDate(input.date) || new Date().toISOString().slice(0, 10);
  const notes = cleanText(input.notes, 160);
  const splitMode: SplitMode =
    input.splitMode === "custom" ? "custom" : "equal";

  if (!title) {
    throw new ApiFailure("expense_title_required", "请填写支出名称");
  }
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw new ApiFailure("expense_amount_invalid", "支出金额必须大于 0");
  }

  const memberResult = await db
    .prepare("SELECT id FROM members WHERE trip_id = ?")
    .bind(tripId)
    .all<{ id: string }>();
  const memberIds = new Set(
    (memberResult.results ?? []).map((member) => member.id)
  );

  if (!memberIds.has(paidBy)) {
    throw new ApiFailure("payer_not_found", "付款人不存在");
  }

  const participants = Array.isArray(input.participants)
    ? [...new Set(input.participants.filter((id) => memberIds.has(id)))]
    : [];
  let shares: ExpenseShare[] = [];

  if (splitMode === "equal") {
    if (participants.length === 0) {
      throw new ApiFailure("participants_required", "至少选择一位分摊成员");
    }
    shares = divideEqually(amountCents, participants);
  } else {
    shares = Array.isArray(input.customShares)
      ? input.customShares
          .filter((share) => memberIds.has(share.memberId))
          .map((share) => ({
            memberId: share.memberId,
            amountCents: Math.round(Number(share.amountCents))
          }))
          .filter((share) => share.amountCents > 0)
      : [];
    const customTotal = shares.reduce(
      (total, share) => total + share.amountCents,
      0
    );
    if (shares.length === 0 || customTotal !== amountCents) {
      throw new ApiFailure(
        "custom_total_mismatch",
        "指定金额之和必须等于支出总额"
      );
    }
  }

  const expenseId = uid();
  const createdAt = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        `INSERT INTO expenses
         (id, trip_id, title, amount_cents, category, paid_by, expense_date, notes, split_mode, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        expenseId,
        tripId,
        title,
        amountCents,
        category,
        paidBy,
        date,
        notes,
        splitMode,
        createdAt
      ),
    ...shares.map((share) =>
      db
        .prepare(
          `INSERT INTO expense_shares (expense_id, member_id, amount_cents)
           VALUES (?, ?, ?)`
        )
        .bind(expenseId, share.memberId, share.amountCents)
    )
  ]);

  return expenseId;
}

async function createDemo(db: D1Database, locale = "zh-CN") {
  const isEnglish = locale === "en-US";
  const trip = await createTripCore(db, {
    name: isEnglish ? "Seven Days in Yunnan" : "云南七日慢旅行",
    destination: isEnglish ? "Dali · Lijiang" : "大理 · 丽江",
    startDate: "2026-10-18",
    endDate: "2026-10-24",
    currency: "CNY",
    members: isEnglish
      ? ["Mia", "Leo", "Nora", "Alex"]
      : ["阿岚", "大周", "小满", "老许"]
  });

  const membersResult = await db
    .prepare(
      "SELECT id, name FROM members WHERE trip_id = ? ORDER BY created_at ASC"
    )
    .bind(trip.id)
    .all<{ id: string; name: string }>();
  const members = membersResult.results ?? [];
  const allMembers = members.map((member) => member.id);

  if (members.length < 4) return trip;

  const expenses: CreateExpenseInput[] = [
    {
      title: isEnglish ? "Three nights at guesthouse" : "民宿三晚",
      amountCents: 168000,
      category: "住宿",
      paidBy: members[0].id,
      date: "2026-10-18",
      notes: isEnglish ? "Courtyard by the old town east gate" : "古城东门小院",
      splitMode: "equal",
      participants: allMembers,
      customShares: []
    },
    {
      title: isEnglish ? "Erhai Lake charter" : "环洱海包车",
      amountCents: 68000,
      category: "交通",
      paidBy: members[1].id,
      date: "2026-10-19",
      notes: isEnglish ? "Two days, driver meals included" : "两天含司机餐补",
      splitMode: "equal",
      participants: allMembers,
      customShares: []
    },
    {
      title: isEnglish ? "Mushroom hotpot" : "菌子火锅",
      amountCents: 43600,
      category: "餐饮",
      paidBy: members[2].id,
      date: "2026-10-19",
      notes: "",
      splitMode: "equal",
      participants: allMembers,
      customShares: []
    },
    {
      title: isEnglish ? "Jade Dragon Snow Mountain tickets" : "玉龙雪山门票",
      amountCents: 48000,
      category: "门票",
      paidBy: members[3].id,
      date: "2026-10-21",
      notes: isEnglish ? "Includes the main cableway" : "含大索道",
      splitMode: "equal",
      participants: allMembers,
      customShares: []
    },
    {
      title: isEnglish ? "Tie-dye workshop" : "扎染体验",
      amountCents: 36000,
      category: "其他",
      paidBy: members[0].id,
      date: "2026-10-22",
      notes: isEnglish ? "For two travelers" : "两人体验",
      splitMode: "custom",
      participants: [members[0].id, members[2].id],
      customShares: [
        { memberId: members[0].id, amountCents: 18000 },
        { memberId: members[2].id, amountCents: 18000 }
      ]
    }
  ];

  for (const expense of expenses) {
    await createExpenseCore(db, trip.id, expense);
  }

  return trip;
}

async function handleApi(request: Request, env: Env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  }

  if (path === "/api/health" && method === "GET") {
    return json({ ok: true, service: "aatrip" });
  }

  if (path === "/api/demo" && method === "POST") {
    let locale = "zh-CN";
    try {
      const body = (await request.json()) as { locale?: string };
      if (body.locale === "en-US") locale = "en-US";
    } catch {
      // An empty request body still creates the default Chinese sample.
    }

    try {
      const result = await createDemo(env.DB, locale);
      return json(result, 201);
    } catch (cause) {
      return errorFrom(cause, "创建示例失败", "demo_failed", 500);
    }
  }

  if (path === "/api/trips" && method === "POST") {
    try {
      const input = (await request.json()) as CreateTripInput;
      const result = await createTripCore(env.DB, input);
      return json(result, 201);
    } catch (cause) {
      return errorFrom(cause, "创建失败", "create_failed");
    }
  }

  if (path === "/api/trips/join" && method === "POST") {
    try {
      const body = (await request.json()) as { code?: string };
      const code = cleanText(body.code, 6).toUpperCase();
      const trip = await env.DB
        .prepare("SELECT id FROM trips WHERE invite_code = ?")
        .bind(code)
        .first<{ id: string }>();
      if (!trip) {
        return error("没有找到这个行程码", 404, "invite_not_found");
      }
      return json({ id: trip.id });
    } catch {
      return error("行程码格式不正确", 400, "invalid_invite_code");
    }
  }

  const tripMatch = path.match(/^\/api\/trips\/([^/]+)$/);
  if (tripMatch) {
    const tripId = decodeURIComponent(tripMatch[1]);

    if (method === "GET") {
      const snapshot = await getSnapshot(env.DB, tripId);
      return snapshot
        ? json(snapshot)
        : error("行程不存在", 404, "trip_not_found");
    }

    if (method === "PUT") {
      const current = await env.DB
        .prepare("SELECT * FROM trips WHERE id = ?")
        .bind(tripId)
        .first<TripRow>();
      if (!current) {
        return error("行程不存在", 404, "trip_not_found");
      }

      try {
        const body = (await request.json()) as Partial<Trip>;
        const name = cleanText(body.name ?? current.name, 40);
        const destination = cleanText(
          body.destination ?? current.destination,
          40
        );
        const currency = CURRENCIES.has(
          String(body.currency ?? current.currency).toUpperCase()
        )
          ? String(body.currency ?? current.currency).toUpperCase()
          : current.currency;
        const startDate = validDate(body.startDate) || current.start_date;
        const endDate = validDate(body.endDate) || current.end_date;

        if (!name) {
          return error("行程名称不能为空", 400, "trip_name_empty");
        }
        await env.DB
          .prepare(
            `UPDATE trips
             SET name = ?, destination = ?, start_date = ?, end_date = ?, currency = ?
             WHERE id = ?`
          )
          .bind(name, destination, startDate, endDate, currency, tripId)
          .run();

        const updated = await env.DB
          .prepare("SELECT * FROM trips WHERE id = ?")
          .bind(tripId)
          .first<TripRow>();
        return json(toTrip(updated as TripRow));
      } catch (cause) {
        return errorFrom(cause, "更新行程失败", "trip_update_failed");
      }
    }
  }

  const memberCollectionMatch = path.match(
    /^\/api\/trips\/([^/]+)\/members$/
  );
  if (memberCollectionMatch && method === "POST") {
    const tripId = decodeURIComponent(memberCollectionMatch[1]);
    try {
      const body = (await request.json()) as { name?: string };
      const name = cleanText(body.name, 16);
      if (!name) {
        return error("请填写成员名字", 400, "member_name_required");
      }

      const countResult = await env.DB
        .prepare("SELECT COUNT(*) AS count FROM members WHERE trip_id = ?")
        .bind(tripId)
        .first<{ count: number }>();
      if (Number(countResult?.count ?? 0) >= 16) {
        return error("单个行程最多 16 位成员", 400, "member_limit");
      }

      const member: Member = {
        id: uid(),
        name,
        color: COLORS[Number(countResult?.count ?? 0) % COLORS.length],
        createdAt: new Date().toISOString()
      };
      await env.DB
        .prepare(
          `INSERT INTO members (id, trip_id, name, color, created_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(
          member.id,
          tripId,
          member.name,
          member.color,
          member.createdAt
        )
        .run();
      return json(member, 201);
    } catch (cause) {
      return errorFrom(cause, "添加成员失败", "member_add_failed");
    }
  }

  const memberMatch = path.match(
    /^\/api\/trips\/([^/]+)\/members\/([^/]+)$/
  );
  if (memberMatch && method === "DELETE") {
    const tripId = decodeURIComponent(memberMatch[1]);
    const memberId = decodeURIComponent(memberMatch[2]);
    const reference = await env.DB
      .prepare(
        `SELECT
          (SELECT COUNT(*) FROM expenses WHERE trip_id = ? AND paid_by = ?) +
          (SELECT COUNT(*) FROM expense_shares WHERE member_id = ?) AS count`
      )
      .bind(tripId, memberId, memberId)
      .first<{ count: number }>();

    if (Number(reference?.count ?? 0) > 0) {
      return error(
        "该成员已参与支出，暂不能删除",
        400,
        "member_has_expenses"
      );
    }

    await env.DB
      .prepare("DELETE FROM members WHERE id = ? AND trip_id = ?")
      .bind(memberId, tripId)
      .run();
    return json({ ok: true });
  }

  const expenseCollectionMatch = path.match(
    /^\/api\/trips\/([^/]+)\/expenses$/
  );
  if (expenseCollectionMatch && method === "POST") {
    const tripId = decodeURIComponent(expenseCollectionMatch[1]);
    try {
      const input = (await request.json()) as CreateExpenseInput;
      const id = await createExpenseCore(env.DB, tripId, input);
      return json({ id }, 201);
    } catch (cause) {
      return errorFrom(cause, "保存支出失败", "save_expense_failed");
    }
  }

  const expenseMatch = path.match(
    /^\/api\/trips\/([^/]+)\/expenses\/([^/]+)$/
  );
  if (expenseMatch && method === "DELETE") {
    const tripId = decodeURIComponent(expenseMatch[1]);
    const expenseId = decodeURIComponent(expenseMatch[2]);
    await env.DB
      .prepare("DELETE FROM expenses WHERE id = ? AND trip_id = ?")
      .bind(expenseId, tripId)
      .run();
    return json({ ok: true });
  }

  return error("接口不存在", 404, "endpoint_not_found");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname.startsWith("/api/")) {
      const response = await handleApi(request, env);
      response.headers.set("Access-Control-Allow-Origin", "*");
      return response;
    }

    return env.ASSETS.fetch(request);
  }
};
