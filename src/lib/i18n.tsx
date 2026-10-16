import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  formatDate as formatDateValue,
  formatDateRange as formatDateRangeValue,
  formatMoney as formatMoneyValue
} from "./format";

export type Locale = "zh-CN" | "en-US";

export const localeOptions: Array<{
  value: Locale;
  shortLabel: string;
  label: string;
}> = [
  { value: "zh-CN", shortLabel: "中", label: "中文" },
  { value: "en-US", shortLabel: "EN", label: "English" }
];

const zhCN = {
  "meta.title": "AA簿 · 旅行分账",
  "meta.description":
    "AA簿 - 轻松记录旅行共同支出，自动计算每个人该付和该收多少。",
  "brand.name": "AA簿",
  "brand.tagline": "TRAVEL LEDGER",
  "language.label": "切换语言",
  "language.chinese": "中文",
  "language.english": "English",
  "common.returnHome": "返回首页",
  "common.copyInvite": "复制邀请",
  "common.cancel": "取消",
  "common.close": "关闭",
  "common.unknown": "未知",
  "common.dateTbd": "日期待定",
  "common.noCategory": "暂无",
  "common.expenseCount": "{count} 笔支出",
  "common.memberCount": "{count} 位成员",
  "common.peopleCount": "{count} 人",
  "common.transferCount": "{count} 笔",
  "app.loading": "正在翻开账本...",
  "app.errorTitle": "这个账本暂时打不开",

  "errors.request_failed": "请求失败，请稍后重试",
  "errors.load_failed": "加载失败",
  "errors.trip_name_required": "先给这次旅行起个名字",
  "errors.members_required": "至少留下一位同行成员",
  "errors.invite_code_length": "请输入 6 位行程码",
  "errors.create_failed": "创建失败",
  "errors.join_failed": "加入失败",
  "errors.demo_failed": "生成示例失败",
  "errors.delete_failed": "删除失败",
  "errors.member_add_failed": "添加失败",
  "errors.member_remove_failed": "移除失败",
  "errors.expense_title_required": "请填写这笔支出是什么",
  "errors.expense_amount_invalid": "请输入大于 0 的金额",
  "errors.payer_not_found": "付款人不存在",
  "errors.participants_required": "至少选择一位分摊成员",
  "errors.custom_total_mismatch": "每个人的金额之和必须等于支出总额",
  "errors.save_expense_failed": "保存失败",
  "errors.trip_not_found": "行程不存在",
  "errors.invite_not_found": "没有找到这个行程码",
  "errors.invalid_invite_code": "行程码格式不正确",
  "errors.trip_name_empty": "行程名称不能为空",
  "errors.trip_update_failed": "更新行程失败",
  "errors.member_name_required": "请填写成员名字",
  "errors.member_limit": "单个行程最多 16 位成员",
  "errors.member_has_expenses": "该成员已参与支出，暂不能删除",
  "errors.trip_create_failed": "创建行程失败",
  "errors.demo_create_failed": "创建示例失败",
  "errors.endpoint_not_found": "接口不存在",

  "welcome.demo": "看看示例",
  "welcome.homeLabel": "AA簿首页",
  "welcome.kicker": "旅程账本",
  "welcome.headlineLine1": "一起出发，",
  "welcome.headlineLine2": "也要一起算清。",
  "welcome.story":
    "订房、包车、吃饭、买票。每一笔都记在原地，谁先垫付，谁该补多少，一眼明白。",
  "welcome.route": "本次路线",
  "welcome.travelers": "04 人同行",
  "welcome.routeStart": "上海",
  "welcome.routeStartLabel": "出发",
  "welcome.routeMid": "昆明",
  "welcome.routeMidLabel": "中转",
  "welcome.routeEnd": "大理",
  "welcome.routeEndLabel": "目的地",
  "welcome.stamp": "自由行",
  "welcome.noteSettle": "自动结算",
  "welcome.noteShare": "多人共享",
  "welcome.noteDaily": "每日明细",
  "welcome.createTab": "新建行程",
  "welcome.joinTab": "加入行程",
  "welcome.createHeading": "这趟去哪儿？",
  "welcome.createCopy": "先建立账本，邀请同行的人一起记。",
  "welcome.tripName": "行程名称",
  "welcome.tripNamePlaceholder": "例如：十一云南慢旅行",
  "welcome.destination": "目的地",
  "welcome.destinationPlaceholder": "大理 · 丽江",
  "welcome.currency": "记账币种",
  "welcome.startDate": "出发日期",
  "welcome.endDate": "返程日期",
  "welcome.members": "同行成员",
  "welcome.defaultMember": "我",
  "welcome.memberPlaceholder": "成员名字",
  "welcome.removeMember": "删除成员 {index}",
  "welcome.addMember": "再加一位",
  "welcome.createTrip": "建立旅行账本",
  "welcome.inviteCodeHint": "位行程码",
  "welcome.joinHeading": "加入大家正在记的账",
  "welcome.joinCopy": "输入同伴分享给你的 6 位行程码。",
  "welcome.inviteCode": "行程码",
  "welcome.openTrip": "打开这个账本",
  "welcome.footer": "旅行一起走，账单也一起算。",
  "welcome.statsTotal": "总访问人数",
  "welcome.statsToday": "今日访问人数",
  "currency.CNY": "人民币 CNY",
  "currency.JPY": "日元 JPY",
  "currency.THB": "泰铢 THB",
  "currency.USD": "美元 USD",
  "currency.EUR": "欧元 EUR",
  "currency.SGD": "新加坡元 SGD",
  "currency.HKD": "港币 HKD",

  "nav.overview": "总览",
  "nav.expenses": "支出",
  "nav.balances": "结算",
  "nav.members": "成员",
  "nav.aria": "账本导航",
  "nav.mobileAria": "移动端导航",
  "workspace.tripLedger": "旅行账本",
  "workspace.destinationTbd": "目的地待定",
  "workspace.inviteHint": "把行程码发给同行的人",
  "workspace.inviteMember": "邀请同伴",
  "workspace.inviteCode": "行程码",
  "workspace.invitePopover": "对方注册后输入行程码，就能进入同一个账本。",
  "workspace.addExpense": "记一笔",
  "header.sharedExpenseCount": "{count} 笔共同支出",
  "header.pendingSettlementCount": "{count} 笔待结算",
  "header.settled": "当前已结平",
  "header.memberCount": "{count} 人同行",
  "header.overviewTitle": "旅程总览",
  "header.expensesTitle": "支出明细",
  "header.balancesTitle": "谁该补多少",
  "header.membersTitle": "成员与邀请",
  "confirm.deleteExpense": "删除“{title}”？这笔支出会影响所有人的结算。",
  "confirm.removeMember": "移除成员“{name}”？",
  "notices.expenseDeleted": "支出已删除",
  "notices.memberAdded": "成员已加入",
  "notices.memberRemoved": "成员已移除",
  "notices.inviteCopied": "邀请信息已复制",
  "notices.codeOnly": "行程码：{code}",
  "notices.expenseSaved": "支出已记入账本",
  "invite.share": "AA簿邀请：{trip}\n行程码：{code}\n链接：{link}",

  "categories.all": "全部",
  "categories.food": "餐饮",
  "categories.lodging": "住宿",
  "categories.transport": "交通",
  "categories.tickets": "门票",
  "categories.shopping": "购物",
  "categories.other": "其他",

  "overview.sharedExpenses": "共同支出",
  "overview.expenseSummary": "{count} 笔支出 · {currency} 记账",
  "overview.perPerson": "人均",
  "overview.topCategory": "最大开销",
  "overview.pendingSettlement": "待结算",
  "overview.settled": "已结平",
  "overview.recentExpenses": "最近支出",
  "overview.allDetails": "全部明细",
  "overview.emptyTitle": "账本还是空的",
  "overview.emptyCopy": "第一笔通常从车票或民宿开始。",
  "overview.firstExpense": "记第一笔",
  "overview.currentBalance": "当前平衡",
  "overview.transferSettle": "{count} 笔转账即可结平",
  "overview.allSquared": "大家已经两清",
  "overview.spendWhere": "花在哪儿",
  "overview.emptyCategory": "有了支出后，这里会显示分类占比。",

  "expenses.paidBy": "{name}垫付",
  "expenses.equalSplit": "{count} 人均分",
  "expenses.customSplit": "指定金额",
  "expenses.deleteAria": "删除 {title}",
  "expenses.deleteTitle": "删除支出",
  "expenses.search": "搜索支出...",
  "expenses.filterTotal": "筛选合计",
  "expenses.allExpenses": "{count} 笔支出",
  "expenses.add": "添加支出",
  "expenses.noMatch": "没有匹配的支出",
  "expenses.noMatchCopy": "换个关键词，或者查看全部分类。",
  "expenses.clearFilters": "清除筛选",

  "balances.boardTitlePending": "这几笔转完，大家就两清了。",
  "balances.boardTitleSettled": "目前账目已经结平。",
  "balances.boardCopy": "按最少笔数计算，不影响每个人的实际消费记录。",
  "balances.pendingTransfers": "笔待转账",
  "balances.suggested": "建议转账",
  "balances.pay": "付款",
  "balances.receive": "收款",
  "balances.none": "无需转账",
  "balances.noneCopy": "所有人的垫付和分摊刚好平衡。",
  "balances.netEach": "每人净额",
  "balances.paidOwed": "垫付 {paid} · 应摊 {owed}",
  "balances.net": "净额",

  "members.intro": "同行的人输入行程码后，会直接进入这个账本。",
  "members.travelers": "{count} 位同行成员",
  "members.paid": "垫付 {amount}",
  "members.addHeading": "还有谁一起？",
  "members.name": "成员名字",
  "members.namePlaceholder": "例如：小林",
  "members.add": "添加成员",
  "members.tip": "已经参与支出的成员不能直接移除，避免账目丢失。",
  "members.remove": "移除成员",
  "members.removeAria": "移除 {name}",

  "dialog.title": "记一笔共同支出",
  "dialog.amount": "支出金额",
  "dialog.avgEstimate": "人均预估",
  "dialog.name": "支出名称",
  "dialog.namePlaceholder": "例如：环洱海包车",
  "dialog.category": "分类",
  "dialog.paidBy": "谁先垫付",
  "dialog.date": "支出日期",
  "dialog.splitMode": "分摊方式",
  "dialog.equal": "平均分摊",
  "dialog.custom": "指定金额",
  "dialog.participants": "参与分摊的人",
  "dialog.selectAll": "全选",
  "dialog.deselectAll": "取消全选",
  "dialog.shareDue": "应摊 {amount}",
  "dialog.participating": "参与分摊",
  "dialog.notParticipating": "不参与",
  "dialog.customEach": "指定每人金额",
  "dialog.allocated": "已分配 {amount}",
  "dialog.notes": "备注（选填）",
  "dialog.notesPlaceholder": "补充订单、地点或约定...",
  "dialog.save": "保存支出"
} as const;

export type TranslationKey = keyof typeof zhCN;

const enUS: Record<TranslationKey, string> = {
  "meta.title": "AA Ledger · Travel Split",
  "meta.description":
    "AA Ledger makes it easy to track shared travel expenses and settle up fairly.",
  "brand.name": "AA Ledger",
  "brand.tagline": "TRAVEL LEDGER",
  "language.label": "Change language",
  "language.chinese": "Chinese",
  "language.english": "English",
  "common.returnHome": "Back home",
  "common.copyInvite": "Copy invite",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.unknown": "Unknown",
  "common.dateTbd": "Dates to be decided",
  "common.noCategory": "No data",
  "common.expenseCount": "{count} expenses",
  "common.memberCount": "{count} members",
  "common.peopleCount": "{count} travelers",
  "common.transferCount": "{count} transfers",
  "app.loading": "Opening the ledger...",
  "app.errorTitle": "This ledger cannot be opened right now",

  "errors.request_failed": "Request failed. Please try again.",
  "errors.load_failed": "Could not load the ledger",
  "errors.trip_name_required": "Give this trip a name first",
  "errors.members_required": "Keep at least one traveler",
  "errors.invite_code_length": "Enter the 6-character trip code",
  "errors.create_failed": "Could not create the trip",
  "errors.join_failed": "Could not join the trip",
  "errors.demo_failed": "Could not create the sample trip",
  "errors.delete_failed": "Could not delete the expense",
  "errors.member_add_failed": "Could not add the member",
  "errors.member_remove_failed": "Could not remove the member",
  "errors.expense_title_required": "What was this expense for?",
  "errors.expense_amount_invalid": "Enter an amount greater than 0",
  "errors.payer_not_found": "The selected payer was not found",
  "errors.participants_required": "Select at least one traveler to split with",
  "errors.custom_total_mismatch":
    "The individual amounts must add up to the total",
  "errors.save_expense_failed": "Could not save the expense",
  "errors.trip_not_found": "Trip not found",
  "errors.invite_not_found": "That trip code was not found",
  "errors.invalid_invite_code": "That trip code has an invalid format",
  "errors.trip_name_empty": "Trip name cannot be empty",
  "errors.trip_update_failed": "Could not update the trip",
  "errors.member_name_required": "Enter a member name",
  "errors.member_limit": "A trip can have at most 16 members",
  "errors.member_has_expenses":
    "This member is already part of an expense and cannot be removed",
  "errors.trip_create_failed": "Could not create the trip",
  "errors.demo_create_failed": "Could not create the sample trip",
  "errors.endpoint_not_found": "API endpoint not found",

  "welcome.demo": "Try the sample",
  "welcome.homeLabel": "AA Ledger home",
  "welcome.kicker": "TRAVEL LEDGER",
  "welcome.headlineLine1": "Travel together.",
  "welcome.headlineLine2": "Settle up together.",
  "welcome.story":
    "Stays, rides, meals, tickets. Keep every shared cost in one place and know who paid and who owes what.",
  "welcome.route": "THIS ROUTE",
  "welcome.travelers": "04 TRAVELERS",
  "welcome.routeStart": "Shanghai",
  "welcome.routeStartLabel": "Departure",
  "welcome.routeMid": "Kunming",
  "welcome.routeMidLabel": "Stopover",
  "welcome.routeEnd": "Dali",
  "welcome.routeEndLabel": "Destination",
  "welcome.stamp": "INDEPENDENT",
  "welcome.noteSettle": "Auto settle",
  "welcome.noteShare": "Shared live",
  "welcome.noteDaily": "Daily details",
  "welcome.createTab": "New trip",
  "welcome.joinTab": "Join trip",
  "welcome.createHeading": "Where are we going?",
  "welcome.createCopy": "Start a ledger and invite the group to add expenses.",
  "welcome.tripName": "Trip name",
  "welcome.tripNamePlaceholder": "e.g. Seven days in Yunnan",
  "welcome.destination": "Destination",
  "welcome.destinationPlaceholder": "Dali · Lijiang",
  "welcome.currency": "Currency",
  "welcome.startDate": "Start date",
  "welcome.endDate": "End date",
  "welcome.members": "Travelers",
  "welcome.defaultMember": "Me",
  "welcome.memberPlaceholder": "Member name",
  "welcome.removeMember": "Remove member {index}",
  "welcome.addMember": "Add another",
  "welcome.createTrip": "Create travel ledger",
  "welcome.inviteCodeHint": "character trip code",
  "welcome.joinHeading": "Join the shared ledger",
  "welcome.joinCopy": "Enter the 6-character code shared by your travel mates.",
  "welcome.inviteCode": "Trip code",
  "welcome.openTrip": "Open this ledger",
  "welcome.footer": "Travel together. Settle together.",
  "welcome.statsTotal": "Total visitors",
  "welcome.statsToday": "Visitors today",
  "currency.CNY": "Chinese yuan CNY",
  "currency.JPY": "Japanese yen JPY",
  "currency.THB": "Thai baht THB",
  "currency.USD": "US dollar USD",
  "currency.EUR": "Euro EUR",
  "currency.SGD": "Singapore dollar SGD",
  "currency.HKD": "Hong Kong dollar HKD",

  "nav.overview": "Overview",
  "nav.expenses": "Expenses",
  "nav.balances": "Settle",
  "nav.members": "Members",
  "nav.aria": "Ledger navigation",
  "nav.mobileAria": "Mobile navigation",
  "workspace.tripLedger": "Travel ledger",
  "workspace.destinationTbd": "Destination to be decided",
  "workspace.inviteHint": "Share the trip code with your group",
  "workspace.inviteMember": "Invite",
  "workspace.inviteCode": "Trip code",
  "workspace.invitePopover":
    "Anyone with this code can open the same shared ledger.",
  "workspace.addExpense": "Add expense",
  "header.sharedExpenseCount": "{count} shared expenses",
  "header.pendingSettlementCount": "{count} transfers to settle",
  "header.settled": "All settled",
  "header.memberCount": "{count} travelers",
  "header.overviewTitle": "Trip overview",
  "header.expensesTitle": "Expense details",
  "header.balancesTitle": "Who owes what",
  "header.membersTitle": "Members & invite",
  "confirm.deleteExpense":
    "Delete “{title}”? This will change everyone’s settlement.",
  "confirm.removeMember": "Remove “{name}”?",
  "notices.expenseDeleted": "Expense deleted",
  "notices.memberAdded": "Member added",
  "notices.memberRemoved": "Member removed",
  "notices.inviteCopied": "Invite copied",
  "notices.codeOnly": "Trip code: {code}",
  "notices.expenseSaved": "Expense added to the ledger",
  "invite.share": "AA Ledger invite: {trip}\nTrip code: {code}\nLink: {link}",

  "categories.all": "All",
  "categories.food": "Food",
  "categories.lodging": "Stay",
  "categories.transport": "Transport",
  "categories.tickets": "Tickets",
  "categories.shopping": "Shopping",
  "categories.other": "Other",

  "overview.sharedExpenses": "Shared expenses",
  "overview.expenseSummary": "{count} expenses · tracked in {currency}",
  "overview.perPerson": "Per person",
  "overview.topCategory": "Top category",
  "overview.pendingSettlement": "To settle",
  "overview.settled": "Settled",
  "overview.recentExpenses": "Recent expenses",
  "overview.allDetails": "View all",
  "overview.emptyTitle": "The ledger is empty",
  "overview.emptyCopy": "Most trips start with a ticket or a stay.",
  "overview.firstExpense": "Add first expense",
  "overview.currentBalance": "Current balance",
  "overview.transferSettle": "{count} transfers will settle everyone",
  "overview.allSquared": "Everyone is settled",
  "overview.spendWhere": "Where it went",
  "overview.emptyCategory": "Category totals will appear after expenses are added.",

  "expenses.paidBy": "Paid by {name}",
  "expenses.equalSplit": "Split by {count}",
  "expenses.customSplit": "Custom split",
  "expenses.deleteAria": "Delete {title}",
  "expenses.deleteTitle": "Delete expense",
  "expenses.search": "Search expenses...",
  "expenses.filterTotal": "Filtered total",
  "expenses.allExpenses": "{count} expenses",
  "expenses.add": "Add expense",
  "expenses.noMatch": "No matching expenses",
  "expenses.noMatchCopy": "Try another keyword or clear the category filter.",
  "expenses.clearFilters": "Clear filters",

  "balances.boardTitlePending": "These transfers settle the ledger.",
  "balances.boardTitleSettled": "Everything is settled.",
  "balances.boardCopy":
    "Calculated with the fewest transfers, without changing anyone’s expenses.",
  "balances.pendingTransfers": "transfers",
  "balances.suggested": "Suggested transfers",
  "balances.pay": "Pays",
  "balances.receive": "Receives",
  "balances.none": "No transfers needed",
  "balances.noneCopy": "Everyone’s payments and shares are perfectly balanced.",
  "balances.netEach": "Net by traveler",
  "balances.paidOwed": "Paid {paid} · share {owed}",
  "balances.net": "Net",

  "members.intro": "Share the trip code and the group can open this ledger.",
  "members.travelers": "{count} travelers",
  "members.paid": "Paid {amount}",
  "members.addHeading": "Who else is coming?",
  "members.name": "Member name",
  "members.namePlaceholder": "e.g. Mia",
  "members.add": "Add member",
  "members.tip":
    "Members already included in an expense cannot be removed, so the ledger stays intact.",
  "members.remove": "Remove member",
  "members.removeAria": "Remove {name}",

  "dialog.title": "Add a shared expense",
  "dialog.amount": "Expense amount",
  "dialog.avgEstimate": "Estimated per person",
  "dialog.name": "Expense name",
  "dialog.namePlaceholder": "e.g. Erhai Lake charter",
  "dialog.category": "Category",
  "dialog.paidBy": "Paid by",
  "dialog.date": "Expense date",
  "dialog.splitMode": "Split method",
  "dialog.equal": "Split equally",
  "dialog.custom": "Custom amounts",
  "dialog.participants": "Who shares this expense",
  "dialog.selectAll": "Select all",
  "dialog.deselectAll": "Clear all",
  "dialog.shareDue": "Share {amount}",
  "dialog.participating": "Included",
  "dialog.notParticipating": "Excluded",
  "dialog.customEach": "Amount per person",
  "dialog.allocated": "Allocated {amount}",
  "dialog.notes": "Notes (optional)",
  "dialog.notesPlaceholder": "Add an order, place, or agreement...",
  "dialog.save": "Save expense"
};

const messages: Record<Locale, Record<TranslationKey, string>> = {
  "zh-CN": zhCN,
  "en-US": enUS
};

export type TranslationParams = Record<string, string | number>;

function interpolate(template: string, params?: TranslationParams) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(params, key)
      ? String(params[key])
      : match
  );
}

function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem("aatrip:locale");
    if (stored === "zh-CN" || stored === "en-US") return stored;
  } catch {
    // Continue with the browser language when storage is unavailable.
  }

  const browserLocales = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  return browserLocales.some((value) => value.toLowerCase().startsWith("zh"))
    ? "zh-CN"
    : "en-US";
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  formatMoney: (
    cents: number,
    currency?: string,
    options?: { signed?: boolean; compact?: boolean }
  ) => string;
  formatDate: (value: string, style?: "short" | "long") => string;
  formatDateRange: (startDate: string, endDate: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) =>
      interpolate(messages[locale][key] ?? key, params),
    [locale]
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t("meta.title");
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", t("meta.description"));

    try {
      localStorage.setItem("aatrip:locale", locale);
    } catch {
      // Storage is optional; the current session still keeps the selection.
    }
  }, [locale, t]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      formatMoney: (cents, currency = "CNY", options = {}) =>
        formatMoneyValue(cents, currency, { ...options, locale }),
      formatDate: (date, style = "short") =>
        formatDateValue(date, style, locale),
      formatDateRange: (startDate, endDate) =>
        formatDateRangeValue(
          startDate,
          endDate,
          locale,
          interpolate(messages[locale]["common.dateTbd"])
        )
    }),
    [locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
