import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent
} from "react";
import {
  BedDouble,
  CarFront,
  Check,
  LoaderCircle,
  MoreHorizontal,
  ShoppingBag,
  Ticket,
  Utensils,
  X
} from "lucide-react";
import { api } from "../lib/api";
import {
  initials,
  parseMoneyToCents,
  todayISO
} from "../lib/format";
import {
  expenseCategories,
  expenseCategoryKey
} from "../lib/categories";
import { getErrorMessage } from "../lib/api";
import { useI18n } from "../lib/i18n";
import type { CreateExpenseInput, Member, Trip } from "../types";

interface ExpenseDialogProps {
  trip: Trip;
  members: Member[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}

const categoryIcons = {
  餐饮: Utensils,
  住宿: BedDouble,
  交通: CarFront,
  门票: Ticket,
  购物: ShoppingBag,
  其他: MoreHorizontal
} as const;

const currencySymbols: Record<string, string> = {
  CNY: "¥",
  JPY: "¥",
  USD: "$",
  EUR: "€",
  THB: "฿",
  SGD: "S$",
  HKD: "HK$",
  KRW: "₩",
  GBP: "£",
  AUD: "A$",
  MYR: "RM",
  TWD: "NT$"
};

export function ExpenseDialog({
  trip,
  members,
  onClose,
  onSaved
}: ExpenseDialogProps) {
  const { t, formatMoney } = useI18n();
  const amountInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("餐饮");
  const [paidBy, setPaidBy] = useState(members[0]?.id ?? "");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
  const [participants, setParticipants] = useState(() =>
    members.map((member) => member.id)
  );
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(
    () => Object.fromEntries(members.map((member) => [member.id, ""]))
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.classList.add("dialog-open");
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("dialog-open");
    };
  }, [busy, onClose]);

  useEffect(() => {
    if (window.innerWidth > 780) {
      amountInputRef.current?.focus({ preventScroll: true });
    }
  }, []);

  const amountCents = parseMoneyToCents(amount);
  const equalShares = useMemo(() => {
    if (participants.length === 0 || amountCents <= 0) return [];
    const base = Math.floor(amountCents / participants.length);
    let remainder = amountCents - base * participants.length;
    return participants.map((memberId) => {
      const extra = remainder > 0 ? 1 : 0;
      remainder -= extra;
      return { memberId, amountCents: base + extra };
    });
  }, [amountCents, participants]);

  const customTotal = members.reduce(
    (total, member) =>
      total + parseMoneyToCents(customAmounts[member.id] ?? ""),
    0
  );

  function toggleParticipant(memberId: string) {
    setParticipants((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId]
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError(t("errors.expense_title_required"));
      return;
    }
    if (amountCents <= 0) {
      setError(t("errors.expense_amount_invalid"));
      return;
    }
    if (splitMode === "equal" && participants.length === 0) {
      setError(t("errors.participants_required"));
      return;
    }
    if (splitMode === "custom" && customTotal !== amountCents) {
      setError(t("errors.custom_total_mismatch"));
      return;
    }

    const customShares = members
      .map((member) => ({
        memberId: member.id,
        amountCents: parseMoneyToCents(customAmounts[member.id] ?? "")
      }))
      .filter((share) => share.amountCents > 0);

    const input: CreateExpenseInput = {
      title: title.trim(),
      amountCents,
      category,
      paidBy,
      date,
      notes: notes.trim(),
      splitMode,
      participants,
      customShares
    };

    setBusy(true);
    setError("");
    try {
      await api.addExpense(trip.id, input);
      await onSaved();
    } catch (cause) {
      setError(getErrorMessage(cause, t, "errors.save_expense_failed"));
    } finally {
      setBusy(false);
    }
  }

  const symbol = currencySymbols[trip.currency] ?? trip.currency;

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !busy) onClose();
      }}
    >
      <section
        className="expense-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-dialog-title"
      >
        <header className="dialog-header">
          <div>
            <span>NEW EXPENSE</span>
            <h2 id="expense-dialog-title">{t("dialog.title")}</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label={t("common.close")}
            onClick={onClose}
            disabled={busy}
          >
            <X size={20} />
          </button>
        </header>

        <form className="expense-form" onSubmit={handleSubmit}>
          <div className="amount-composer">
            <label>
              <span>{t("dialog.amount")}</span>
              <div className="amount-input">
                <b>{symbol}</b>
                <input
                  ref={amountInputRef}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  inputMode="decimal"
                />
              </div>
            </label>
            <div className="amount-preview">
              <span>{t("dialog.avgEstimate")}</span>
              <strong>
                {splitMode === "equal" && participants.length > 0
                  ? formatMoney(
                      Math.round(amountCents / participants.length),
                      trip.currency
                    )
                  : splitMode === "custom"
                    ? formatMoney(customTotal, trip.currency)
                    : formatMoney(0, trip.currency)}
              </strong>
            </div>
          </div>

          <label className="field">
            <span>{t("dialog.name")}</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("dialog.namePlaceholder")}
              maxLength={50}
            />
          </label>

          <div className="field">
            <span>{t("dialog.category")}</span>
            <div className="category-picker">
              {expenseCategories.map((categoryName) => {
                const Icon = categoryIcons[categoryName];
                const labelKey = expenseCategoryKey(categoryName);
                if (!labelKey) return null;
                return (
                  <button
                    key={categoryName}
                    type="button"
                    className={category === categoryName ? "active" : ""}
                    onClick={() => setCategory(categoryName)}
                  >
                    <Icon size={17} />
                    {t(labelKey)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="field-row">
            <label className="field">
              <span>{t("dialog.paidBy")}</span>
              <select
                value={paidBy}
                onChange={(event) => setPaidBy(event.target.value)}
              >
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t("dialog.date")}</span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
          </div>

          <div className="field">
            <span>{t("dialog.splitMode")}</span>
            <div className="split-toggle">
              <button
                type="button"
                className={splitMode === "equal" ? "active" : ""}
                onClick={() => setSplitMode("equal")}
              >
                {t("dialog.equal")}
              </button>
              <button
                type="button"
                className={splitMode === "custom" ? "active" : ""}
                onClick={() => setSplitMode("custom")}
              >
                {t("dialog.custom")}
              </button>
            </div>
          </div>

          {splitMode === "equal" ? (
            <div className="split-section">
              <div className="split-heading">
                <span>{t("dialog.participants")}</span>
                <button
                  type="button"
                  onClick={() =>
                    setParticipants(
                      participants.length === members.length
                        ? []
                        : members.map((member) => member.id)
                    )
                  }
                >
                  {participants.length === members.length
                    ? t("dialog.deselectAll")
                    : t("dialog.selectAll")}
                </button>
              </div>
              <div className="participant-grid">
                {members.map((member) => {
                  const selected = participants.includes(member.id);
                  const share = equalShares.find(
                    (item) => item.memberId === member.id
                  );
                  return (
                    <button
                      key={member.id}
                      type="button"
                      className={selected ? "active" : ""}
                      onClick={() => toggleParticipant(member.id)}
                    >
                      <span
                        className="avatar small"
                        style={
                          {
                            "--avatar-color": member.color
                          } as React.CSSProperties
                        }
                      >
                        {initials(member.name)}
                      </span>
                      <span className="participant-name">
                        <b>{member.name}</b>
                        <small>
                          {selected && share
                            ? t("dialog.shareDue", {
                                amount: formatMoney(
                                  share.amountCents,
                                  trip.currency
                                )
                              })
                            : selected
                              ? t("dialog.participating")
                              : t("dialog.notParticipating")}
                        </small>
                      </span>
                      <i>{selected && <Check size={14} />}</i>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="split-section custom-split">
              <div className="split-heading">
                <span>{t("dialog.customEach")}</span>
                <b className={customTotal === amountCents ? "matched" : ""}>
                  {t("dialog.allocated", {
                    amount: formatMoney(customTotal, trip.currency)
                  })}
                </b>
              </div>
              <div className="custom-share-list">
                {members.map((member) => (
                  <label key={member.id}>
                    <span
                      className="avatar small"
                      style={
                        {
                          "--avatar-color": member.color
                        } as React.CSSProperties
                      }
                    >
                      {initials(member.name)}
                    </span>
                    <b>{member.name}</b>
                    <span className="mini-amount-input">
                      <i>{symbol}</i>
                      <input
                        value={customAmounts[member.id] ?? ""}
                        onChange={(event) =>
                          setCustomAmounts((current) => ({
                            ...current,
                            [member.id]: event.target.value
                          }))
                        }
                        placeholder="0.00"
                        inputMode="decimal"
                      />
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <label className="field">
            <span>{t("dialog.notes")}</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t("dialog.notesPlaceholder")}
              maxLength={160}
              rows={3}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <footer className="dialog-footer">
            <button
              type="button"
              className="button button-ghost"
              onClick={onClose}
              disabled={busy}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={busy}
            >
              {busy ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <Check size={18} />
              )}
              {t("dialog.save")}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
