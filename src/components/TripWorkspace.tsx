import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BedDouble,
  CalendarDays,
  CarFront,
  Check,
  ChevronRight,
  Clipboard,
  Copy,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  MapPin,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Scale,
  Search,
  ShoppingBag,
  Ticket,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  Utensils
} from "lucide-react";
import { api } from "../lib/api";
import {
  initials
} from "../lib/format";
import {
  expenseCategories,
  expenseCategoryKey
} from "../lib/categories";
import { getErrorMessage } from "../lib/api";
import { useI18n, type TranslationKey } from "../lib/i18n";
import type { Expense, TripSnapshot } from "../types";
import { ExpenseDialog } from "./ExpenseDialog";
import { LanguageSwitch } from "./LanguageSwitch";

type Tab = "overview" | "expenses" | "balances" | "members";

interface TripWorkspaceProps {
  snapshot: TripSnapshot;
  onRefresh: () => Promise<void>;
  onLeave: () => void;
}

const tabs: Array<{
  id: Tab;
  labelKey: TranslationKey;
  icon: typeof LayoutDashboard;
}> = [
  { id: "overview", labelKey: "nav.overview", icon: LayoutDashboard },
  { id: "expenses", labelKey: "nav.expenses", icon: ReceiptText },
  { id: "balances", labelKey: "nav.balances", icon: Scale },
  { id: "members", labelKey: "nav.members", icon: Users }
];

const categories = [
  { value: "全部", labelKey: "categories.all" },
  { value: "餐饮", labelKey: "categories.food" },
  { value: "住宿", labelKey: "categories.lodging" },
  { value: "交通", labelKey: "categories.transport" },
  { value: "门票", labelKey: "categories.tickets" },
  { value: "购物", labelKey: "categories.shopping" },
  { value: "其他", labelKey: "categories.other" }
] as const;

const categoryIcons = {
  餐饮: Utensils,
  住宿: BedDouble,
  交通: CarFront,
  门票: Ticket,
  购物: ShoppingBag,
  其他: MoreHorizontal
} as const;

function CategoryMark({ category }: { category: string }) {
  const Icon =
    categoryIcons[category as keyof typeof categoryIcons] ?? MoreHorizontal;
  return (
    <span className={`category-mark category-${category}`}>
      <Icon size={18} />
    </span>
  );
}

export function TripWorkspace({
  snapshot,
  onRefresh,
  onLeave
}: TripWorkspaceProps) {
  const { locale, t, formatDateRange } = useI18n();
  const [tab, setTab] = useState<Tab>("overview");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [memberName, setMemberName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const { trip, members, expenses, balances, settlements, summary } = snapshot;

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) void onRefresh();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [onRefresh]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filteredExpenses = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return expenses.filter((expense) => {
      const matchesCategory =
        category === "全部" || expense.category === category;
      const matchesQuery =
        !normalized ||
        expense.title.toLowerCase().includes(normalized) ||
        expense.notes.toLowerCase().includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [category, expenses, query]);

  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const expense of expenses) {
      totals.set(
        expense.category,
        (totals.get(expense.category) ?? 0) + expense.amountCents
      );
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const maxBalance = Math.max(
    1,
    ...balances.map((balance) => Math.abs(balance.netCents))
  );
  const memberNameById = new Map(
    members.map((member) => [member.id, member.name])
  );

  async function handleDeleteExpense(expense: Expense) {
    if (
      !window.confirm(
        t("confirm.deleteExpense", { title: expense.title })
      )
    ) {
      return;
    }
    try {
      await api.removeExpense(trip.id, expense.id);
      await onRefresh();
      setNotice(t("notices.expenseDeleted"));
    } catch (cause) {
      setNotice(getErrorMessage(cause, t, "errors.delete_failed"));
    }
  }

  async function handleAddMember(event: FormEvent) {
    event.preventDefault();
    if (!memberName.trim()) return;
    setBusy(true);
    try {
      await api.addMember(trip.id, memberName.trim());
      setMemberName("");
      await onRefresh();
      setNotice(t("notices.memberAdded"));
    } catch (cause) {
      setNotice(getErrorMessage(cause, t, "errors.member_add_failed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveMember(memberId: string, name: string) {
    if (!window.confirm(t("confirm.removeMember", { name }))) return;
    try {
      await api.removeMember(trip.id, memberId);
      await onRefresh();
      setNotice(t("notices.memberRemoved"));
    } catch (cause) {
      setNotice(getErrorMessage(cause, t, "errors.member_remove_failed"));
    }
  }

  async function copyInvite() {
    const inviteLink = `${window.location.origin}/#/trip/${trip.id}`;
    try {
      await navigator.clipboard.writeText(
        t("invite.share", {
          trip: trip.name,
          code: trip.inviteCode,
          link: inviteLink
        })
      );
      setNotice(t("notices.inviteCopied"));
      setShareOpen(false);
    } catch {
      setNotice(t("notices.codeOnly", { code: trip.inviteCode }));
    }
  }

  const todayLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(new Date());

  const headerCopy: Record<Tab, { eyebrow: string; title: string }> = {
    overview: {
      eyebrow: trip.destination || t("workspace.tripLedger"),
      title: t("header.overviewTitle")
    },
    expenses: {
      eyebrow: t("header.sharedExpenseCount", { count: expenses.length }),
      title: t("header.expensesTitle")
    },
    balances: {
      eyebrow:
        settlements.length > 0
          ? t("header.pendingSettlementCount", {
              count: settlements.length
            })
          : t("header.settled"),
      title: t("header.balancesTitle")
    },
    members: {
      eyebrow: t("header.memberCount", { count: members.length }),
      title: t("header.membersTitle")
    }
  };

  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="sidebar-top">
          <a className="sidebar-brand" href="#" onClick={onLeave}>
            <span className="brand-mark">AA</span>
            <span className="brand-copy">
              <b>{t("brand.name")}</b>
              <small>{t("brand.tagline")}</small>
            </span>
          </a>
          <LanguageSwitch tone="dark" />
        </div>

        <div className="sidebar-trip">
          <span className="trip-label">CURRENT TRIP</span>
          <h2>{trip.name}</h2>
          <p>
            <MapPin size={14} />
            {trip.destination || t("workspace.destinationTbd")}
          </p>
          <p>
            <CalendarDays size={14} />
            {formatDateRange(trip.startDate, trip.endDate)}
          </p>
        </div>

        <nav className="side-nav" aria-label={t("nav.aria")}>
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={tab === item.id ? "active" : ""}
                onClick={() => setTab(item.id)}
              >
                <Icon size={19} />
                <span>{t(item.labelKey)}</span>
                {item.id === "balances" && settlements.length > 0 && (
                  <b className="nav-badge">{settlements.length}</b>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-invite">
          <span>INVITE CODE</span>
          <button type="button" onClick={copyInvite}>
            <strong>{trip.inviteCode}</strong>
            <Copy size={16} />
          </button>
          <small>{t("workspace.inviteHint")}</small>
        </div>

        <button className="leave-button" type="button" onClick={onLeave}>
          <LogOut size={17} />
          {t("common.returnHome")}
        </button>
      </aside>

      <main className="workspace-main">
        <header className="workspace-header">
          <div>
            <p>{headerCopy[tab].eyebrow}</p>
            <h1>{headerCopy[tab].title}</h1>
          </div>
          <div className="header-actions">
            <span className="today-label">{todayLabel}</span>
            <div className="share-wrap">
              <button
                className="button button-ghost share-button"
                type="button"
                onClick={() => setShareOpen((open) => !open)}
              >
                <UserPlus size={18} />
                {t("workspace.inviteMember")}
              </button>
              {shareOpen && (
                <div className="share-popover">
                  <span>{t("workspace.inviteCode")}</span>
                  <strong>{trip.inviteCode}</strong>
                  <p>{t("workspace.invitePopover")}</p>
                  <button
                    className="button button-dark button-wide"
                    type="button"
                    onClick={copyInvite}
                  >
                    <Clipboard size={16} />
                    {t("common.copyInvite")}
                  </button>
                </div>
              )}
            </div>
            <button
              className="button button-primary icon-leading"
              type="button"
              onClick={() => setDialogOpen(true)}
            >
              <Plus size={18} />
              {t("workspace.addExpense")}
            </button>
          </div>
        </header>

        <div className="workspace-content">
          {tab === "overview" && (
            <OverviewTab
              snapshot={snapshot}
              categoryTotals={categoryTotals}
              maxBalance={maxBalance}
              onAdd={() => setDialogOpen(true)}
              onShowAll={() => setTab("expenses")}
              onSettle={() => setTab("balances")}
              onDeleteExpense={handleDeleteExpense}
            />
          )}

          {tab === "expenses" && (
            <ExpensesTab
              expenses={filteredExpenses}
              currency={trip.currency}
              query={query}
              category={category}
              memberNameById={memberNameById}
              onQueryChange={setQuery}
              onCategoryChange={setCategory}
              onAdd={() => setDialogOpen(true)}
              onDelete={handleDeleteExpense}
            />
          )}

          {tab === "balances" && (
            <BalancesTab
              snapshot={snapshot}
              maxBalance={maxBalance}
            />
          )}

          {tab === "members" && (
            <MembersTab
              snapshot={snapshot}
              memberName={memberName}
              busy={busy}
              onMemberNameChange={setMemberName}
              onSubmit={handleAddMember}
              onRemove={handleRemoveMember}
              onCopyInvite={copyInvite}
            />
          )}
        </div>
      </main>

      <nav className="mobile-nav" aria-label={t("nav.mobileAria")}>
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? "active" : ""}
              onClick={() => setTab(item.id)}
            >
              <Icon size={20} />
              <span>{t(item.labelKey)}</span>
            </button>
          );
        })}
        <button
          type="button"
          className="mobile-add"
          onClick={() => setDialogOpen(true)}
        >
          <Plus size={22} />
          <span>{t("workspace.addExpense")}</span>
        </button>
      </nav>

      {dialogOpen && (
        <ExpenseDialog
          trip={trip}
          members={members}
          onClose={() => setDialogOpen(false)}
          onSaved={async () => {
            setDialogOpen(false);
            await onRefresh();
            setNotice(t("notices.expenseSaved"));
          }}
        />
      )}

      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
        </div>
      )}
    </div>
  );
}

interface OverviewTabProps {
  snapshot: TripSnapshot;
  categoryTotals: Array<[string, number]>;
  maxBalance: number;
  onAdd: () => void;
  onShowAll: () => void;
  onSettle: () => void;
  onDeleteExpense: (expense: Expense) => void;
}

function OverviewTab({
  snapshot,
  categoryTotals,
  maxBalance,
  onAdd,
  onShowAll,
  onSettle,
  onDeleteExpense
}: OverviewTabProps) {
  const { t, formatMoney } = useI18n();
  const { trip, expenses, balances, settlements, summary } = snapshot;
  const recentExpenses = expenses.slice(0, 5);
  const categoryMax = Math.max(1, ...categoryTotals.map(([, total]) => total));
  const topCategoryKey = expenseCategoryKey(summary.topCategory);
  const topCategory =
    summary.topCategory && summary.topCategory !== "暂无"
      ? topCategoryKey
        ? t(topCategoryKey)
        : summary.topCategory
      : t("common.noCategory");

  return (
    <div className="overview-tab">
      <section className="summary-band">
        <div className="summary-main">
          <span>{t("overview.sharedExpenses")}</span>
          <strong>{formatMoney(summary.totalCents, trip.currency)}</strong>
          <p>
            {t("overview.expenseSummary", {
              count: summary.expenseCount,
              currency: trip.currency
            })}
          </p>
        </div>
        <div className="summary-stat">
          <span>{t("overview.perPerson")}</span>
          <b>{formatMoney(summary.perPersonCents, trip.currency)}</b>
        </div>
        <div className="summary-stat">
          <span>{t("overview.topCategory")}</span>
          <b>{topCategory}</b>
        </div>
        <div className="summary-stat">
          <span>{t("overview.pendingSettlement")}</span>
          <b>
            {settlements.length
              ? t("common.transferCount", { count: settlements.length })
              : t("overview.settled")}
          </b>
        </div>
        <div className="summary-route" aria-hidden="true">
          <span className="route-pin start" />
          <span className="route-path" />
          <span className="route-pin end" />
        </div>
      </section>

      <div className="overview-grid">
        <section className="surface recent-panel">
          <div className="section-title">
            <div>
              <span>RECENT</span>
              <h2>{t("overview.recentExpenses")}</h2>
            </div>
            <button type="button" className="text-button" onClick={onShowAll}>
              {t("overview.allDetails")} <ChevronRight size={15} />
            </button>
          </div>

          {recentExpenses.length > 0 ? (
            <div className="expense-list compact-list">
              {recentExpenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  currency={trip.currency}
                  payerName={
                    snapshot.members.find(
                      (member) => member.id === expense.paidBy
                    )?.name ?? t("common.unknown")
                  }
                  onDelete={onDeleteExpense}
                />
              ))}
            </div>
          ) : (
            <div className="empty-expenses">
              <div className="empty-ticket">
                <ReceiptText size={26} />
              </div>
              <h3>{t("overview.emptyTitle")}</h3>
              <p>{t("overview.emptyCopy")}</p>
              <button
                className="button button-dark"
                type="button"
                onClick={onAdd}
              >
                <Plus size={17} />
                {t("overview.firstExpense")}
              </button>
            </div>
          )}
        </section>

        <section className="surface balance-panel">
          <div className="section-title">
            <div>
              <span>BALANCE</span>
              <h2>{t("overview.currentBalance")}</h2>
            </div>
            <TrendingUp size={20} />
          </div>
          <div className="balance-bars">
            {balances.map((balance) => (
              <div className="balance-bar-row" key={balance.memberId}>
                <span
                  className="avatar tiny"
                  style={{ "--avatar-color": balance.color } as React.CSSProperties}
                >
                  {initials(balance.name)}
                </span>
                <div className="balance-bar-copy">
                  <div>
                    <b>{balance.name}</b>
                    <span
                      className={
                        balance.netCents >= 0 ? "positive" : "negative"
                      }
                    >
                      {formatMoney(balance.netCents, trip.currency, {
                        signed: true
                      })}
                    </span>
                  </div>
                  <div className="bar-track">
                    <span
                      className={balance.netCents >= 0 ? "positive" : "negative"}
                      style={{
                        width: `${Math.max(
                          5,
                          (Math.abs(balance.netCents) / maxBalance) * 100
                        )}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="settle-preview"
            onClick={onSettle}
          >
            <span>
              {settlements.length > 0
                ? t("overview.transferSettle", {
                    count: settlements.length
                  })
                : t("overview.allSquared")}
            </span>
            <ChevronRight size={17} />
          </button>
        </section>

        <section className="surface category-panel">
          <div className="section-title">
            <div>
              <span>BREAKDOWN</span>
              <h2>{t("overview.spendWhere")}</h2>
            </div>
          </div>
          {categoryTotals.length > 0 ? (
            <div className="category-breakdown">
              {categoryTotals.map(([name, total]) => {
                const categoryKey = expenseCategoryKey(name);
                return (
                  <div className="category-row" key={name}>
                    <CategoryMark category={name} />
                    <div>
                      <span>{categoryKey ? t(categoryKey) : name}</span>
                      <div className="category-track">
                        <i style={{ width: `${(total / categoryMax) * 100}%` }} />
                      </div>
                    </div>
                    <b>{formatMoney(total, trip.currency)}</b>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="empty-copy">{t("overview.emptyCategory")}</p>
          )}
        </section>
      </div>
    </div>
  );
}

interface ExpenseRowProps {
  expense: Expense;
  currency: string;
  payerName: string;
  onDelete: (expense: Expense) => void;
}

function ExpenseRow({
  expense,
  currency,
  payerName,
  onDelete
}: ExpenseRowProps) {
  const { t, formatDate, formatMoney } = useI18n();

  return (
    <article className="expense-row">
      <CategoryMark category={expense.category} />
      <div className="expense-info">
        <h3>{expense.title}</h3>
        <p>
          {formatDate(expense.date)} ·{" "}
          {t("expenses.paidBy", { name: payerName })}
          {expense.notes ? ` · ${expense.notes}` : ""}
        </p>
      </div>
      <div className="expense-amount">
        <strong>{formatMoney(expense.amountCents, currency)}</strong>
        <span>
          {expense.splitMode === "equal"
            ? t("expenses.equalSplit", { count: expense.shares.length })
            : t("expenses.customSplit")}
        </span>
      </div>
      <button
        className="icon-button delete-button"
        type="button"
        aria-label={t("expenses.deleteAria", { title: expense.title })}
        title={t("expenses.deleteTitle")}
        onClick={() => onDelete(expense)}
      >
        <Trash2 size={16} />
      </button>
    </article>
  );
}

interface ExpensesTabProps {
  expenses: Expense[];
  currency: string;
  query: string;
  category: string;
  memberNameById: Map<string, string>;
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onAdd: () => void;
  onDelete: (expense: Expense) => void;
}

function ExpensesTab({
  expenses,
  currency,
  query,
  category,
  memberNameById,
  onQueryChange,
  onCategoryChange,
  onAdd,
  onDelete
}: ExpensesTabProps) {
  const { t, formatMoney } = useI18n();
  const total = expenses.reduce(
    (sum, expense) => sum + expense.amountCents,
    0
  );

  return (
    <div className="expenses-tab">
      <section className="expense-toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t("expenses.search")}
          />
        </label>
        <div className="category-filter">
          {categories.map((item) => (
            <button
              key={item.value}
              type="button"
              className={category === item.value ? "active" : ""}
              onClick={() => onCategoryChange(item.value)}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
        <div className="filter-total">
          <span>{t("expenses.filterTotal")}</span>
          <b>{formatMoney(total, currency)}</b>
        </div>
      </section>

      <section className="surface expense-table">
        <div className="section-title expense-table-head">
          <div>
            <span>ALL EXPENSES</span>
              <h2>{t("expenses.allExpenses", { count: expenses.length })}</h2>
          </div>
          <button className="button button-primary" type="button" onClick={onAdd}>
            <Plus size={17} />
            {t("expenses.add")}
          </button>
        </div>

        {expenses.length > 0 ? (
          <div className="expense-list">
            {expenses.map((expense) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                currency={currency}
                payerName={
                  memberNameById.get(expense.paidBy) ?? t("common.unknown")
                }
                onDelete={onDelete}
              />
            ))}
          </div>
        ) : (
          <div className="empty-expenses table-empty">
            <div className="empty-ticket">
              <Search size={26} />
            </div>
            <h3>{t("expenses.noMatch")}</h3>
            <p>{t("expenses.noMatchCopy")}</p>
            <button
              className="button button-dark"
              type="button"
              onClick={() => {
                onQueryChange("");
                onCategoryChange("全部");
              }}
            >
              {t("expenses.clearFilters")}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function BalancesTab({
  snapshot,
  maxBalance
}: {
  snapshot: TripSnapshot;
  maxBalance: number;
}) {
  const { t, formatMoney } = useI18n();
  const { trip, balances, settlements } = snapshot;

  return (
    <div className="balances-tab">
      <section className="settlement-board">
        <div className="settlement-copy">
          <span>SETTLEMENT</span>
          <h2>
            {settlements.length > 0
              ? t("balances.boardTitlePending")
              : t("balances.boardTitleSettled")}
          </h2>
          <p>{t("balances.boardCopy")}</p>
        </div>
        <div className="settlement-count">
          <strong>{settlements.length}</strong>
          <span>{t("balances.pendingTransfers")}</span>
        </div>
      </section>

      <div className="balances-grid">
        <section className="surface settlement-list-panel">
          <div className="section-title">
            <div>
              <span>PAYMENTS</span>
              <h2>{t("balances.suggested")}</h2>
            </div>
          </div>
          {settlements.length > 0 ? (
            <div className="settlement-list">
              {settlements.map((settlement) => (
                <div
                  className="settlement-row"
                  key={`${settlement.fromMemberId}-${settlement.toMemberId}`}
                >
                  <div className="settlement-person">
                    <span className="avatar small neutral">
                      {initials(settlement.fromName)}
                    </span>
                    <div>
                      <span>{t("balances.pay")}</span>
                      <b>{settlement.fromName}</b>
                    </div>
                  </div>
                  <div className="settlement-arrow">
                    <span />
                    <ChevronRight size={17} />
                  </div>
                  <div className="settlement-person">
                    <span className="avatar small warm">
                      {initials(settlement.toName)}
                    </span>
                    <div>
                      <span>{t("balances.receive")}</span>
                      <b>{settlement.toName}</b>
                    </div>
                  </div>
                  <strong className="settlement-amount">
                    {formatMoney(settlement.amountCents, trip.currency)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="settled-state">
              <Check size={28} />
              <h3>{t("balances.none")}</h3>
              <p>{t("balances.noneCopy")}</p>
            </div>
          )}
        </section>

        <section className="surface all-balances-panel">
          <div className="section-title">
            <div>
              <span>NET POSITION</span>
              <h2>{t("balances.netEach")}</h2>
            </div>
          </div>
          <div className="all-balances">
            {balances.map((balance) => (
              <div className="member-balance-row" key={balance.memberId}>
                <span
                  className="avatar"
                  style={
                    { "--avatar-color": balance.color } as React.CSSProperties
                  }
                >
                  {initials(balance.name)}
                </span>
                <div className="member-balance-main">
                  <div>
                    <b>{balance.name}</b>
                    <span>
                      {t("balances.paidOwed", {
                        paid: formatMoney(balance.paidCents, trip.currency),
                        owed: formatMoney(balance.owedCents, trip.currency)
                      })}
                    </span>
                  </div>
                  <div className="balance-bar">
                    <span
                      className={balance.netCents >= 0 ? "positive" : "negative"}
                      style={{
                        width: `${Math.max(
                          4,
                          (Math.abs(balance.netCents) / maxBalance) * 100
                        )}%`
                      }}
                    />
                  </div>
                </div>
                <strong
                  className={balance.netCents >= 0 ? "positive" : "negative"}
                >
                  {formatMoney(balance.netCents, trip.currency, {
                    signed: true
                  })}
                </strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

interface MembersTabProps {
  snapshot: TripSnapshot;
  memberName: string;
  busy: boolean;
  onMemberNameChange: (value: string) => void;
  onSubmit: (event: FormEvent) => Promise<void>;
  onRemove: (memberId: string, name: string) => Promise<void>;
  onCopyInvite: () => Promise<void>;
}

function MembersTab({
  snapshot,
  memberName,
  busy,
  onMemberNameChange,
  onSubmit,
  onRemove,
  onCopyInvite
}: MembersTabProps) {
  const { t, formatMoney } = useI18n();
  const { trip, members, balances } = snapshot;
  const balanceMap = new Map(
    balances.map((balance) => [balance.memberId, balance])
  );

  return (
    <div className="members-tab">
      <section className="invite-banner">
        <div>
          <span>INVITE CODE</span>
          <strong>{trip.inviteCode}</strong>
        </div>
        <p>{t("members.intro")}</p>
        <button
          className="button button-light"
          type="button"
          onClick={onCopyInvite}
        >
          <Copy size={17} />
          {t("common.copyInvite")}
        </button>
      </section>

      <div className="members-grid">
        <section className="surface member-list-panel">
          <div className="section-title">
            <div>
              <span>TRAVELERS</span>
              <h2>{t("members.travelers", { count: members.length })}</h2>
            </div>
          </div>
          <div className="member-list">
            {members.map((member) => {
              const balance = balanceMap.get(member.id);
              return (
                <article className="member-card" key={member.id}>
                  <span
                    className="avatar large"
                    style={
                      { "--avatar-color": member.color } as React.CSSProperties
                    }
                  >
                    {initials(member.name)}
                  </span>
                  <div className="member-card-copy">
                    <h3>{member.name}</h3>
                    <p>
                      {t("members.paid", {
                        amount: formatMoney(
                          balance?.paidCents ?? 0,
                          trip.currency
                        )
                      })}
                    </p>
                  </div>
                  <div className="member-card-net">
                    <span>{t("balances.net")}</span>
                    <b
                      className={
                        (balance?.netCents ?? 0) >= 0 ? "positive" : "negative"
                      }
                    >
                      {formatMoney(balance?.netCents ?? 0, trip.currency, {
                        signed: true
                      })}
                    </b>
                  </div>
                  {(balance?.paidCents ?? 0) === 0 &&
                    (balance?.owedCents ?? 0) === 0 && (
                      <button
                        type="button"
                        className="icon-button delete-button"
                        title={t("members.remove")}
                        aria-label={t("members.removeAria", {
                          name: member.name
                        })}
                        onClick={() => void onRemove(member.id, member.name)}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="surface add-member-panel">
          <div className="section-title">
            <div>
              <span>ADD MEMBER</span>
              <h2>{t("members.addHeading")}</h2>
            </div>
          </div>
          <form onSubmit={(event) => void onSubmit(event)}>
            <label className="field">
              <span>{t("members.name")}</span>
              <input
                value={memberName}
                onChange={(event) => onMemberNameChange(event.target.value)}
                placeholder={t("members.namePlaceholder")}
                maxLength={16}
              />
            </label>
            <button
              type="submit"
              className="button button-dark button-wide"
              disabled={busy || !memberName.trim()}
            >
              {busy ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <UserPlus size={18} />
              )}
              {t("members.add")}
            </button>
          </form>
          <p className="member-tip">{t("members.tip")}</p>
        </section>
      </div>
    </div>
  );
}
