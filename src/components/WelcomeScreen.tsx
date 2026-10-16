import { useState, type FormEvent } from "react";
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
import type { CreateTripInput } from "../types";

interface WelcomeScreenProps {
  onOpenTrip: (id: string) => void;
  onCreateTrip: (
    input: CreateTripInput
  ) => Promise<{ id: string; inviteCode: string }>;
  onJoinTrip: (code: string) => Promise<{ id: string }>;
  onCreateDemo: () => Promise<{ id: string; inviteCode: string }>;
}

const currencies = [
  { value: "CNY", label: "人民币 CNY" },
  { value: "JPY", label: "日元 JPY" },
  { value: "THB", label: "泰铢 THB" },
  { value: "USD", label: "美元 USD" },
  { value: "EUR", label: "欧元 EUR" },
  { value: "SGD", label: "新加坡元 SGD" },
  { value: "HKD", label: "港币 HKD" }
];

const emptyTrip: CreateTripInput = {
  name: "",
  destination: "",
  startDate: "",
  endDate: "",
  currency: "CNY",
  members: ["我"]
};

export function WelcomeScreen({
  onOpenTrip,
  onCreateTrip,
  onJoinTrip,
  onCreateDemo
}: WelcomeScreenProps) {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [form, setForm] = useState<CreateTripInput>(emptyTrip);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | "demo" | "">("");
  const [error, setError] = useState("");

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
      setError("先给这次旅行起个名字");
      return;
    }
    if (members.length === 0) {
      setError("至少留下一位同行成员");
      return;
    }

    setBusy("create");
    setError("");
    try {
      const trip = await onCreateTrip({ ...form, members });
      onOpenTrip(trip.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "创建失败");
    } finally {
      setBusy("");
    }
  }

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    if (joinCode.trim().length !== 6) {
      setError("请输入 6 位行程码");
      return;
    }
    setBusy("join");
    setError("");
    try {
      const trip = await onJoinTrip(joinCode.trim().toUpperCase());
      onOpenTrip(trip.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "加入失败");
    } finally {
      setBusy("");
    }
  }

  async function handleDemo() {
    setBusy("demo");
    setError("");
    try {
      const trip = await onCreateDemo();
      onOpenTrip(trip.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "生成示例失败");
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="welcome-page">
      <header className="welcome-nav">
        <a className="brand" href="#" aria-label="AA簿首页">
          <span className="brand-mark">AA</span>
          <span className="brand-copy">
            <b>AA簿</b>
            <small>TRAVEL LEDGER</small>
          </span>
        </a>
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
          看看示例
        </button>
      </header>

      <div className="welcome-layout">
        <section className="welcome-story">
          <div className="story-kicker">
            <span>旅程账本</span>
            <span className="story-line" />
            <span>2026</span>
          </div>
          <h1>
            一起出发，
            <br />
            也要一起算清。
          </h1>
          <p className="story-copy">
            订房、包车、吃饭、买票。每一笔都记在原地，谁先垫付，谁该补多少，一眼明白。
          </p>

          <div className="route-board" aria-hidden="true">
            <div className="route-board-top">
              <span>
                <Route size={15} />
                本次路线
              </span>
              <span>04 人同行</span>
            </div>
            <div className="route-track">
              <span className="route-dot route-dot-start" />
              <span className="route-dot route-dot-mid" />
              <span className="route-dot route-dot-end" />
            </div>
            <div className="route-board-bottom">
              <span>
                <b>上海</b>
                <small>出发</small>
              </span>
              <span>
                <b>昆明</b>
                <small>中转</small>
              </span>
              <span>
                <b>大理</b>
                <small>目的地</small>
              </span>
            </div>
            <div className="route-stamp">
              <MapPin size={22} />
              <span>自由行</span>
            </div>
          </div>

          <div className="story-notes">
            <span>
              <Coins size={17} /> 自动结算
            </span>
            <span>
              <Users size={17} /> 多人共享
            </span>
            <span>
              <CalendarDays size={17} /> 每日明细
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
              新建行程
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
              加入行程
            </button>
          </div>

          {mode === "create" ? (
            <form className="entry-form" onSubmit={handleCreate}>
              <div className="form-heading">
                <span className="step-number">01</span>
                <div>
                  <h2>这趟去哪儿？</h2>
                  <p>先建立账本，邀请同行的人一起记。</p>
                </div>
              </div>

              <label className="field">
                <span>行程名称</span>
                <input
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  placeholder="例如：十一云南慢旅行"
                  maxLength={40}
                  autoFocus
                />
              </label>

              <div className="field-row">
                <label className="field">
                  <span>目的地</span>
                  <div className="input-with-icon">
                    <MapPin size={16} />
                    <input
                      value={form.destination}
                      onChange={(event) =>
                        update("destination", event.target.value)
                      }
                      placeholder="大理 · 丽江"
                      maxLength={40}
                    />
                  </div>
                </label>
                <label className="field field-currency">
                  <span>记账币种</span>
                  <select
                    value={form.currency}
                    onChange={(event) =>
                      update("currency", event.target.value)
                    }
                  >
                    {currencies.map((currency) => (
                      <option key={currency.value} value={currency.value}>
                        {currency.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="field-row">
                <label className="field">
                  <span>出发日期</span>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(event) =>
                      update("startDate", event.target.value)
                    }
                  />
                </label>
                <label className="field">
                  <span>返程日期</span>
                  <input
                    type="date"
                    value={form.endDate}
                    min={form.startDate}
                    onChange={(event) => update("endDate", event.target.value)}
                  />
                </label>
              </div>

              <fieldset className="member-fieldset">
                <legend>同行成员</legend>
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
                        placeholder="成员名字"
                        maxLength={16}
                      />
                      {form.members.length > 1 && (
                        <button
                          type="button"
                          className="icon-button subtle"
                          aria-label={`删除成员 ${index + 1}`}
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
                  再加一位
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
                建立旅行账本
              </button>
            </form>
          ) : (
            <form className="join-form" onSubmit={handleJoin}>
              <div className="join-illustration" aria-hidden="true">
                <div className="ticket-edge left" />
                <span>INVITE</span>
                <strong>6</strong>
                <small>位行程码</small>
                <div className="ticket-edge right" />
              </div>
              <h2>加入大家正在记的账</h2>
              <p>输入同伴分享给你的 6 位行程码。</p>
              <label className="field code-field">
                <span>行程码</span>
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
                打开这个账本
              </button>
            </form>
          )}
        </section>
      </div>

      <footer className="welcome-footer">
        <span>AA</span>
        <p>旅行一起走，账单也一起算。</p>
        <span>2026</span>
      </footer>
    </main>
  );
}
