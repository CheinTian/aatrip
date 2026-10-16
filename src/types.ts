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
