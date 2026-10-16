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
  formatDate,
  formatDateRange,
  formatMoney,
  initials
} from "../lib/format";
import type { Expense, TripSnapshot } from "../types";
import { ExpenseDialog } from "./ExpenseDialog";

type Tab = "overview" | "expenses" | "balances" | "members";

interface TripWorkspaceProps {
  snapshot: TripSnapshot;
  onRefresh: () => Promise<void>;
  onLeave: () => void;
}

const tabs: Array<{
  id: Tab;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "overview", label: "总览", icon: LayoutDashboard },
  { id: "expenses", label: "支出", icon: ReceiptText },
  { id: "balances", label: "结算", icon: Scale },
  { id: "members", label: "成员", icon: Users }
];

const categories = ["全部", "餐饮", "住宿", "交通", "门票", "购物", "其他"];

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
    if (!window.confirm(`删除“${expense.title}”？这笔支出会影响所有人的结算。`)) {
      return;
    }
    try {
      await api.removeExpense(trip.id, expense.id);
      await onRefresh();
      setNotice("支出已删除");
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "删除失败");
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
      setNotice("成员已加入");
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "添加失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveMember(memberId: string, name: string) {
    if (!window.confirm(`移除成员“${name}”？`)) return;
    try {
      await api.removeMember(trip.id, memberId);
      await onRefresh();
      setNotice("成员已移除");
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "移除失败");
    }
  }

  async function copyInvite() {
    const inviteLink = `${window.location.origin}/#/trip/${trip.id}`;
    try {
      await navigator.clipboard.writeText(
        `AA簿邀请：${trip.name}\n行程码：${trip.inviteCode}\n链接：${inviteLink}`
      );
      setNotice("邀请信息已复制");
      setShareOpen(false);
    } catch {
      setNotice(`行程码：${trip.inviteCode}`);
    }
  }

  const todayLabel = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(new Date());

  const headerCopy: Record<Tab, { eyebrow: string; title: string }> = {
    overview: { eyebrow: trip.destination || "旅行账本", title: "旅程总览" },
    expenses: { eyebrow: `${expenses.length} 笔共同支出`, title: "支出明细" },
    balances: {
      eyebrow:
        settlements.length > 0 ? `${settlements.length} 笔待结算` : "当前已结平",
      title: "谁该补多少"
    },
    members: { eyebrow: `${members.length} 人同行`, title: "成员与邀请" }
  };

  return (
    <div className="workspace">
      <aside className="sidebar">
        <a className="sidebar-brand" href="#" onClick={onLeave}>
          <span className="brand-mark">AA</span>
          <span className="brand-copy">
            <b>AA簿</b>
            <small>TRAVEL LEDGER</small>
          </span>
        </a>

        <div className="sidebar-trip">
          <span className="trip-label">CURRENT TRIP</span>
          <h2>{trip.name}</h2>
          <p>
            <MapPin size={14} />
            {trip.destination || "目的地待定"}
          </p>
          <p>
            <CalendarDays size={14} />
            {formatDateRange(trip.startDate, trip.endDate)}
          </p>
        </div>

        <nav className="side-nav" aria-label="账本导航">
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
                <span>{item.label}</span>
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
          <small>把行程码发给同行的人</small>
        </div>

        <button className="leave-button" type="button" onClick={onLeave}>
          <LogOut size={17} />
          返回首页
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
                邀请同伴
              </button>
              {shareOpen && (
                <div className="share-popover">
                  <span>行程码</span>
                  <strong>{trip.inviteCode}</strong>
                  <p>对方注册后输入行程码，就能进入同一个账本。</p>
                  <button
                    className="button button-dark button-wide"
                    type="button"
                    onClick={copyInvite}
                  >
                    <Clipboard size={16} />
                    复制邀请
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
              记一笔
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

      <nav className="mobile-nav" aria-label="移动端导航">
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
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          className="mobile-add"
          onClick={() => setDialogOpen(true)}
        >
          <Plus size={22} />
          <span>记一笔</span>
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
            setNotice("支出已记入账本");
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
  const { trip, expenses, balances, settlements, summary } = snapshot;
  const recentExpenses = expenses.slice(0, 5);
  const categoryMax = Math.max(1, ...categoryTotals.map(([, total]) => total));

  return (
    <div className="overview-tab">
      <section className="summary-band">
        <div className="summary-main">
          <span>共同支出</span>
          <strong>{formatMoney(summary.totalCents, trip.currency)}</strong>
          <p>
            {summary.expenseCount} 笔支出 · {trip.currency} 记账
          </p>
        </div>
        <div className="summary-stat">
          <span>人均</span>
          <b>{formatMoney(summary.perPersonCents, trip.currency)}</b>
        </div>
        <div className="summary-stat">
          <span>最大开销</span>
          <b>{summary.topCategory}</b>
        </div>
        <div className="summary-stat">
          <span>待结算</span>
          <b>{settlements.length ? `${settlements.length} 笔` : "已结平"}</b>
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
              <h2>最近支出</h2>
            </div>
            <button type="button" className="text-button" onClick={onShowAll}>
              全部明细 <ChevronRight size={15} />
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
                    )?.name ?? "未知"
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
              <h3>账本还是空的</h3>
              <p>第一笔通常从车票或民宿开始。</p>
              <button
                className="button button-dark"
                type="button"
                onClick={onAdd}
              >
                <Plus size={17} />
                记第一笔
              </button>
            </div>
          )}
        </section>

        <section className="surface balance-panel">
          <div className="section-title">
            <div>
              <span>BALANCE</span>
              <h2>当前平衡</h2>
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
                ? `${settlements.length} 笔转账即可结平`
                : "大家已经两清"}
            </span>
            <ChevronRight size={17} />
          </button>
        </section>

        <section className="surface category-panel">
          <div className="section-title">
            <div>
              <span>BREAKDOWN</span>
              <h2>花在哪儿</h2>
            </div>
          </div>
          {categoryTotals.length > 0 ? (
            <div className="category-breakdown">
              {categoryTotals.map(([name, total]) => (
                <div className="category-row" key={name}>
                  <CategoryMark category={name} />
                  <div>
                    <span>{name}</span>
                    <div className="category-track">
                      <i style={{ width: `${(total / categoryMax) * 100}%` }} />
                    </div>
                  </div>
                  <b>{formatMoney(total, trip.currency)}</b>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-copy">有了支出后，这里会显示分类占比。</p>
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
  return (
    <article className="expense-row">
      <CategoryMark category={expense.category} />
      <div className="expense-info">
        <h3>{expense.title}</h3>
        <p>
          {formatDate(expense.date)} · {payerName}垫付
          {expense.notes ? ` · ${expense.notes}` : ""}
        </p>
      </div>
      <div className="expense-amount">
        <strong>{formatMoney(expense.amountCents, currency)}</strong>
        <span>
          {expense.splitMode === "equal"
            ? `${expense.shares.length} 人均分`
            : "指定金额"}
        </span>
      </div>
      <button
        className="icon-button delete-button"
        type="button"
        aria-label={`删除 ${expense.title}`}
        title="删除支出"
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
            placeholder="搜索支出..."
          />
        </label>
        <div className="category-filter">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={category === item ? "active" : ""}
              onClick={() => onCategoryChange(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="filter-total">
          <span>筛选合计</span>
          <b>{formatMoney(total, currency)}</b>
        </div>
      </section>

      <section className="surface expense-table">
        <div className="section-title expense-table-head">
          <div>
            <span>ALL EXPENSES</span>
            <h2>{expenses.length} 笔支出</h2>
          </div>
          <button className="button button-primary" type="button" onClick={onAdd}>
            <Plus size={17} />
            添加支出
          </button>
        </div>

        {expenses.length > 0 ? (
          <div className="expense-list">
            {expenses.map((expense) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                currency={currency}
                payerName={memberNameById.get(expense.paidBy) ?? "未知"}
                onDelete={onDelete}
              />
            ))}
          </div>
        ) : (
          <div className="empty-expenses table-empty">
            <div className="empty-ticket">
              <Search size={26} />
            </div>
            <h3>没有匹配的支出</h3>
            <p>换个关键词，或者查看全部分类。</p>
            <button
              className="button button-dark"
              type="button"
              onClick={() => {
                onQueryChange("");
                onCategoryChange("全部");
              }}
            >
              清除筛选
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
  const { trip, balances, settlements } = snapshot;

  return (
    <div className="balances-tab">
      <section className="settlement-board">
        <div className="settlement-copy">
          <span>SETTLEMENT</span>
          <h2>
            {settlements.length > 0
              ? "这几笔转完，大家就两清了。"
              : "目前账目已经结平。"}
          </h2>
          <p>按最少笔数计算，不影响每个人的实际消费记录。</p>
        </div>
        <div className="settlement-count">
          <strong>{settlements.length}</strong>
          <span>笔待转账</span>
        </div>
      </section>

      <div className="balances-grid">
        <section className="surface settlement-list-panel">
          <div className="section-title">
            <div>
              <span>PAYMENTS</span>
              <h2>建议转账</h2>
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
                      <span>付款</span>
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
                      <span>收款</span>
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
              <h3>无需转账</h3>
              <p>所有人的垫付和分摊刚好平衡。</p>
            </div>
          )}
        </section>

        <section className="surface all-balances-panel">
          <div className="section-title">
            <div>
              <span>NET POSITION</span>
              <h2>每人净额</h2>
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
                      垫付 {formatMoney(balance.paidCents, trip.currency)} · 应摊{" "}
                      {formatMoney(balance.owedCents, trip.currency)}
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
        <p>同行的人输入行程码后，会直接进入这个账本。</p>
        <button
          className="button button-light"
          type="button"
          onClick={onCopyInvite}
        >
          <Copy size={17} />
          复制邀请
        </button>
      </section>

      <div className="members-grid">
        <section className="surface member-list-panel">
          <div className="section-title">
            <div>
              <span>TRAVELERS</span>
              <h2>{members.length} 位同行成员</h2>
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
                      垫付 {formatMoney(balance?.paidCents ?? 0, trip.currency)}
                    </p>
                  </div>
                  <div className="member-card-net">
                    <span>净额</span>
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
                        title="移除成员"
                        aria-label={`移除 ${member.name}`}
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
              <h2>还有谁一起？</h2>
            </div>
          </div>
          <form onSubmit={(event) => void onSubmit(event)}>
            <label className="field">
              <span>成员名字</span>
              <input
                value={memberName}
                onChange={(event) => onMemberNameChange(event.target.value)}
                placeholder="例如：小林"
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
              添加成员
            </button>
          </form>
          <p className="member-tip">
            已经参与支出的成员不能直接移除，避免账目丢失。
          </p>
        </section>
      </div>
    </div>
  );
}
