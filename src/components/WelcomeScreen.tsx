import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  CalendarDays,
  Coins,
  LoaderCircle,
  MapPin,
  Minus,
  Plus,
  Route,
  Sparkles,
  Users
} from "lucide-react";
import { getErrorMessage } from "../lib/api";
import { useI18n, type Locale } from "../lib/i18n";
import type { CreateTripInput } from "../types";
import { LanguageSwitch } from "./LanguageSwitch";

interface WelcomeScreenProps {
  onOpenTrip: (id: string) => void;
  onCreateTrip: (
    input: CreateTripInput
  ) => Promise<{ id: string; inviteCode: string }>;
  onJoinTrip: (code: string) => Promise<{ id: string }>;
  onCreateDemo: (locale: Locale) => Promise<{ id: string; inviteCode: string }>;
}

const currencies = [
  { value: "CNY", key: "currency.CNY" },
  { value: "JPY", key: "currency.JPY" },
  { value: "THB", key: "currency.THB" },
  { value: "USD", key: "currency.USD" },
  { value: "EUR", key: "currency.EUR" },
  { value: "SGD", key: "currency.SGD" },
  { value: "HKD", key: "currency.HKD" }
] as const;

const emptyTrip: CreateTripInput = {
  name: "",
  destination: "",
  startDate: "",
  endDate: "",
  currency: "CNY",
  members: [""]
};

export function WelcomeScreen({
  onOpenTrip,
  onCreateTrip,
  onJoinTrip,
  onCreateDemo
}: WelcomeScreenProps) {
  const { locale, t } = useI18n();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [form, setForm] = useState<CreateTripInput>(() => ({
    ...emptyTrip,
    members: [t("welcome.defaultMember")]
  }));
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | "demo" | "">("");
  const [error, setError] = useState("");
  const previousDefaultMember = useRef(t("welcome.defaultMember"));

  useEffect(() => {
    const nextDefaultMember = t("welcome.defaultMember");
    setForm((current) => ({
      ...current,
      members:
        current.members.length === 1 &&
        current.members[0] === previousDefaultMember.current
          ? [nextDefaultMember]
          : current.members
    }));
    previousDefaultMember.current = nextDefaultMember;
    setError("");
  }, [locale, t]);

  function update<K extends keyof CreateTripInput>(
    key: K,
    value: CreateTripInput[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateMember(index: number, value: string) {
    setForm((current) => ({
      ...current,
      members: current.members.map((member, memberIndex) =>
        memberIndex === index ? value : member
      )
    }));
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    const members = form.members.map((member) => member.trim()).filter(Boolean);
    if (!form.name.trim()) {
      setError(t("errors.trip_name_required"));
      return;
    }
    if (members.length === 0) {
      setError(t("errors.members_required"));
      return;
    }

    setBusy("create");
    setError("");
    try {
      const trip = await onCreateTrip({ ...form, members });
      onOpenTrip(trip.id);
    } catch (cause) {
      setError(getErrorMessage(cause, t, "errors.create_failed"));
    } finally {
      setBusy("");
    }
  }

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    if (joinCode.trim().length !== 6) {
      setError(t("errors.invite_code_length"));
      return;
    }
    setBusy("join");
    setError("");
    try {
      const trip = await onJoinTrip(joinCode.trim().toUpperCase());
      onOpenTrip(trip.id);
    } catch (cause) {
      setError(getErrorMessage(cause, t, "errors.join_failed"));
    } finally {
      setBusy("");
    }
  }

  async function handleDemo() {
    setBusy("demo");
    setError("");
    try {
      const trip = await onCreateDemo(locale);
      onOpenTrip(trip.id);
    } catch (cause) {
      setError(getErrorMessage(cause, t, "errors.demo_failed"));
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="welcome-page">
      <header className="welcome-nav">
        <a className="brand" href="#" aria-label={t("welcome.homeLabel")}>
          <span className="brand-mark">AA</span>
          <span className="brand-copy">
            <b>{t("brand.name")}</b>
            <small>{t("brand.tagline")}</small>
          </span>
        </a>
        <div className="welcome-actions">
          <LanguageSwitch />
          <button
            className="demo-link"
            type="button"
            onClick={handleDemo}
            disabled={Boolean(busy)}
          >
            {busy === "demo" ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <Sparkles size={16} />
            )}
            {t("welcome.demo")}
          </button>
        </div>
      </header>

      <div className="welcome-layout">
        <section className="welcome-story">
          <div className="story-kicker">
            <span>{t("welcome.kicker")}</span>
            <span className="story-line" />
            <span>2026</span>
          </div>
          <h1>
            {t("welcome.headlineLine1")}
            <br />
            {t("welcome.headlineLine2")}
          </h1>
          <p className="story-copy">{t("welcome.story")}</p>

          <div className="route-board" aria-hidden="true">
            <div className="route-board-top">
              <span>
                <Route size={15} />
                {t("welcome.route")}
              </span>
              <span>{t("welcome.travelers")}</span>
            </div>
            <div className="route-track">
              <span className="route-dot route-dot-start" />
              <span className="route-dot route-dot-mid" />
              <span className="route-dot route-dot-end" />
            </div>
            <div className="route-board-bottom">
              <span>
                <b>{t("welcome.routeStart")}</b>
                <small>{t("welcome.routeStartLabel")}</small>
              </span>
              <span>
                <b>{t("welcome.routeMid")}</b>
                <small>{t("welcome.routeMidLabel")}</small>
              </span>
              <span>
                <b>{t("welcome.routeEnd")}</b>
                <small>{t("welcome.routeEndLabel")}</small>
              </span>
            </div>
            <div className="route-stamp">
              <MapPin size={22} />
              <span>{t("welcome.stamp")}</span>
            </div>
          </div>

          <div className="story-notes">
            <span>
              <Coins size={17} /> {t("welcome.noteSettle")}
            </span>
            <span>
              <Users size={17} /> {t("welcome.noteShare")}
            </span>
            <span>
              <CalendarDays size={17} /> {t("welcome.noteDaily")}
            </span>
          </div>
        </section>

        <section className="entry-panel">
          <div className="entry-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "create"}
              className={mode === "create" ? "active" : ""}
              onClick={() => {
                setMode("create");
                setError("");
              }}
            >
              {t("welcome.createTab")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "join"}
              className={mode === "join" ? "active" : ""}
              onClick={() => {
                setMode("join");
                setError("");
              }}
            >
              {t("welcome.joinTab")}
            </button>
          </div>

          {mode === "create" ? (
            <form className="entry-form" onSubmit={handleCreate}>
              <div className="form-heading">
                <span className="step-number">01</span>
                <div>
                  <h2>{t("welcome.createHeading")}</h2>
                  <p>{t("welcome.createCopy")}</p>
                </div>
              </div>

              <label className="field">
                <span>{t("welcome.tripName")}</span>
                <input
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  placeholder={t("welcome.tripNamePlaceholder")}
                  maxLength={40}
                  autoFocus
                />
              </label>

              <div className="field-row">
                <label className="field">
                  <span>{t("welcome.destination")}</span>
                  <div className="input-with-icon">
                    <MapPin size={16} />
                    <input
                      value={form.destination}
                      onChange={(event) =>
                        update("destination", event.target.value)
                      }
                      placeholder={t("welcome.destinationPlaceholder")}
                      maxLength={40}
                    />
                  </div>
                </label>
                <label className="field field-currency">
                  <span>{t("welcome.currency")}</span>
                  <select
                    value={form.currency}
                    onChange={(event) =>
                      update("currency", event.target.value)
                    }
                  >
                    {currencies.map((currency) => (
                      <option key={currency.value} value={currency.value}>
                        {t(currency.key)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="field-row">
                <label className="field">
                  <span>{t("welcome.startDate")}</span>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(event) =>
                      update("startDate", event.target.value)
                    }
                  />
                </label>
                <label className="field">
                  <span>{t("welcome.endDate")}</span>
                  <input
                    type="date"
                    value={form.endDate}
                    min={form.startDate}
                    onChange={(event) => update("endDate", event.target.value)}
                  />
                </label>
              </div>

              <fieldset className="member-fieldset">
                <legend>{t("welcome.members")}</legend>
                <div className="member-inputs">
                  {form.members.map((member, index) => (
                    <div className="member-input" key={index}>
                      <span className="member-index">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <input
                        value={member}
                        onChange={(event) =>
                          updateMember(index, event.target.value)
                        }
                        placeholder={t("welcome.memberPlaceholder")}
                        maxLength={16}
                      />
                      {form.members.length > 1 && (
                        <button
                          type="button"
                          className="icon-button subtle"
                          aria-label={t("welcome.removeMember", {
                            index: index + 1
                          })}
                          onClick={() =>
                            update(
                              "members",
                              form.members.filter(
                                (_, memberIndex) => memberIndex !== index
                              )
                            )
                          }
                        >
                          <Minus size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  className="add-member-link"
                  type="button"
                  onClick={() =>
                    update("members", [...form.members, ""])
                  }
                  disabled={form.members.length >= 16}
                >
                  <Plus size={15} />
                  {t("welcome.addMember")}
                </button>
              </fieldset>

              {error && <p className="form-error">{error}</p>}

              <button
                className="button button-primary button-wide"
                type="submit"
                disabled={Boolean(busy)}
              >
                {busy === "create" ? (
                  <LoaderCircle className="spin" size={19} />
                ) : (
                  <ArrowRight size={19} />
                )}
                {t("welcome.createTrip")}
              </button>
            </form>
          ) : (
            <form className="join-form" onSubmit={handleJoin}>
              <div className="join-illustration" aria-hidden="true">
                <div className="ticket-edge left" />
                <span>INVITE</span>
                <strong>6</strong>
                <small>{t("welcome.inviteCodeHint")}</small>
                <div className="ticket-edge right" />
              </div>
              <h2>{t("welcome.joinHeading")}</h2>
              <p>{t("welcome.joinCopy")}</p>
              <label className="field code-field">
                <span>{t("welcome.inviteCode")}</span>
                <input
                  value={joinCode}
                  onChange={(event) =>
                    setJoinCode(
                      event.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, "")
                        .slice(0, 6)
                    )
                  }
                  placeholder="A7K9Q2"
                  autoCapitalize="characters"
                  autoComplete="off"
                  autoFocus
                />
              </label>

              {error && <p className="form-error">{error}</p>}

              <button
                className="button button-primary button-wide"
                type="submit"
                disabled={Boolean(busy)}
              >
                {busy === "join" ? (
                  <LoaderCircle className="spin" size={19} />
                ) : (
                  <ArrowRight size={19} />
                )}
                {t("welcome.openTrip")}
              </button>
            </form>
          )}
        </section>
      </div>

      <footer className="welcome-footer">
        <span>AA</span>
        <p>{t("welcome.footer")}</p>
        <span>2026</span>
      </footer>
    </main>
  );
}
