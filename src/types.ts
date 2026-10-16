export type SplitMode = "equal" | "custom";

export interface Member {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface ExpenseShare {
  memberId: string;
  amountCents: number;
}

export interface Expense {
  id: string;
  tripId: string;
  title: string;
  amountCents: number;
  category: string;
  paidBy: string;
  date: string;
  notes: string;
  splitMode: SplitMode;
  createdAt: string;
  shares: ExpenseShare[];
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  currency: string;
  inviteCode: string;
  createdAt: string;
}

export interface Balance {
  memberId: string;
  name: string;
  color: string;
  paidCents: number;
  owedCents: number;
  netCents: number;
}

export interface Settlement {
  fromMemberId: string;
  fromName: string;
  toMemberId: string;
  toName: string;
  amountCents: number;
}

export interface TripSummary {
  totalCents: number;
  expenseCount: number;
  perPersonCents: number;
  topCategory: string;
}

export interface TripSnapshot {
  trip: Trip;
  members: Member[];
  expenses: Expense[];
  balances: Balance[];
  settlements: Settlement[];
  summary: TripSummary;
}

export interface CreateTripInput {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  currency: string;
  members: string[];
}

export interface CreateExpenseInput {
  title: string;
  amountCents: number;
  category: string;
  paidBy: string;
  date: string;
  notes: string;
  splitMode: SplitMode;
  participants: string[];
  customShares: ExpenseShare[];
}

export interface VisitStats {
  /** Distinct visitors since launch. */
  totalVisitors: number;
  /** Distinct visitors on the current day (Asia/Shanghai). */
  todayVisitors: number;
  /** Total page views, including repeat visits from the same visitor. */
  totalViews: number;
  /** Page views on the current day (Asia/Shanghai). */
  todayViews: number;
  /** The day the counters were computed for, as YYYY-MM-DD. */
  date: string;
}
