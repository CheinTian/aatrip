import SwiftUI

struct DashboardView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    let snapshot: TripSnapshot
    let showExpenses: () -> Void
    let showSettlements: () -> Void
    let addExpense: () -> Void

    private var language: AppLanguage { model.language }
    private var trip: Trip { snapshot.trip }

    private var categoryTotals: [(category: String, cents: Int)] {
        Dictionary(grouping: snapshot.expenses, by: \.category)
            .map { ($0.key, $0.value.reduce(0) { $0 + $1.amountCents }) }
            .sorted { $0.1 > $1.1 }
    }

    private var recentExpenses: [Expense] {
        Array(snapshot.expenses.sorted { $0.date > $1.date }.prefix(4))
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                TripHeroCard(snapshot: snapshot, language: language)

                settlementStrip

                if horizontalSizeClass == .regular {
                    HStack(alignment: .top, spacing: 18) {
                        categoryCard
                            .frame(maxWidth: .infinity, alignment: .top)
                        recentCard
                            .frame(maxWidth: .infinity, alignment: .top)
                    }
                } else {
                    categoryCard
                    recentCard
                }
            }
            .padding(.horizontal, 18)
            .padding(.top, 8)
            .padding(.bottom, 30)
            .frame(maxWidth: 980)
            .frame(maxWidth: .infinity)
        }
        .background(LedgerBackground())
        .navigationTitle(language.text("旅程总览", "Trip overview"))
        .navigationBarTitleDisplayMode(.large)
        .refreshable {
            await model.refresh()
        }
    }

    @ViewBuilder
    private var settlementStrip: some View {
        if snapshot.settlements.isEmpty {
            HStack(spacing: 12) {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(Color.ledgerTeal)
                VStack(alignment: .leading, spacing: 2) {
                    Text(language.text("大家已经两清", "Everyone is settled"))
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color.ledgerInk)
                    Text(language.text("这趟旅程暂时不需要转账", "No transfers are needed for this trip"))
                        .font(.caption)
                        .foregroundStyle(Color.ledgerSecondary)
                }
                Spacer()
            }
            .paperCard(padding: 15)
        } else {
            Button(action: showSettlements) {
                HStack(spacing: 12) {
                    Image(systemName: "arrow.left.arrow.right")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Color.ledgerForest)
                        .frame(width: 40, height: 40)
                        .background(Color.ledgerGoldSoft)
                        .clipShape(Circle())

                    VStack(alignment: .leading, spacing: 3) {
                        Text(
                            language.text(
                                "\(snapshot.settlements.count) 笔转账即可结平",
                                "\(snapshot.settlements.count) transfers settle the trip"
                            )
                        )
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color.ledgerInk)
                        Text(language.text("按最少笔数计算", "Calculated with the fewest transfers"))
                            .font(.caption)
                            .foregroundStyle(Color.ledgerSecondary)
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(Color.ledgerSecondary)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(PressableButtonStyle())
            .paperCard(padding: 14)
        }
    }

    private var categoryCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            SectionTitle(title: language.text("花在哪儿", "Spending by category"))

            if categoryTotals.isEmpty {
                Text(language.text("有了支出后，这里会显示分类占比。", "Category totals appear after the first expense."))
                    .font(.subheadline)
                    .foregroundStyle(Color.ledgerSecondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 8)
            } else {
                let maximum = max(1, categoryTotals.first?.cents ?? 1)
                VStack(spacing: 15) {
                    ForEach(categoryTotals, id: \.category) { item in
                        CategoryTotalRow(
                            category: item.category,
                            amount: item.cents,
                            maximum: maximum,
                            currency: trip.currency,
                            language: language
                        )
                    }
                }
            }
        }
        .paperCard()
    }

    private var recentCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionTitle(
                title: language.text("最近支出", "Recent expenses"),
                actionTitle: language.text("全部明细", "See all"),
                action: showExpenses
            )

            if recentExpenses.isEmpty {
                EmptyLedgerView(
                    symbol: "receipt",
                    title: language.text("账本还是空的", "The ledger is empty"),
                    message: language.text("第一笔通常从车票或民宿开始。", "Start with a train ticket or a place to stay."),
                    actionTitle: language.text("记第一笔", "Add the first expense"),
                    action: addExpense
                )
            } else {
                let names = Dictionary(uniqueKeysWithValues: snapshot.members.map { ($0.id, $0.name) })
                VStack(spacing: 0) {
                    ForEach(Array(recentExpenses.enumerated()), id: \.element.id) { index, expense in
                        ExpenseListRow(
                            expense: expense,
                            payerName: names[expense.paidBy] ?? language.text("未知", "Unknown"),
                            currency: trip.currency,
                            language: language
                        )
                        if index < recentExpenses.count - 1 {
                            Divider()
                                .overlay(Color.ledgerLine)
                                .padding(.leading, 50)
                        }
                    }
                }
            }
        }
        .paperCard()
    }
}

private struct TripHeroCard: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @ScaledMetric(relativeTo: .largeTitle) private var amountSize: CGFloat = 40

    let snapshot: TripSnapshot
    let language: AppLanguage

    private var trip: Trip { snapshot.trip }
    private var usesAccessibilityLayout: Bool { dynamicTypeSize.isAccessibilitySize }

    var body: some View {
        VStack(alignment: .leading, spacing: usesAccessibilityLayout ? 20 : 22) {
            if usesAccessibilityLayout {
                accessibilityHeader
            } else {
                header
            }

            VStack(alignment: .leading, spacing: 7) {
                Text(language.text("共同支出", "Shared expenses"))
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.58))
                Text(Money.string(cents: snapshot.summary.totalCents, currency: trip.currency, language: language))
                    .font(.system(size: amountSize, weight: .medium, design: .monospaced))
                    .foregroundStyle(.white)
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)
                    .contentTransition(.numericText())
            }

            metrics

            Rectangle()
                .fill(.white.opacity(0.15))
                .frame(height: 1)

            RouteTrack(
                destination: trip.destination,
                startDate: trip.startDate,
                endDate: trip.endDate,
                language: language
            )
        }
        .padding(20)
        .background {
            ZStack(alignment: .topTrailing) {
                Color.ledgerForest
                Canvas { context, size in
                    let spacing: CGFloat = 18
                    var path = Path()
                    stride(from: 0, through: size.width, by: spacing).forEach { x in
                        path.move(to: CGPoint(x: x, y: 0))
                        path.addLine(to: CGPoint(x: x, y: size.height))
                    }
                    stride(from: 0, through: size.height, by: spacing).forEach { y in
                        path.move(to: CGPoint(x: 0, y: y))
                        path.addLine(to: CGPoint(x: size.width, y: y))
                    }
                    context.stroke(path, with: .color(.white.opacity(0.035)), lineWidth: 0.5)
                }
                Circle()
                    .stroke(.white.opacity(0.05), lineWidth: 34)
                    .frame(width: 230, height: 230)
                    .offset(x: 85, y: -90)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .shadow(color: Color.ledgerForest.opacity(0.2), radius: 22, y: 12)
        .accessibilityElement(children: .contain)
    }

    private var header: some View {
        HStack(alignment: .top, spacing: 16) {
            tripIdentity
            Spacer(minLength: 8)
            tripCode
        }
    }

    private var accessibilityHeader: some View {
        VStack(alignment: .leading, spacing: 14) {
            tripIdentity

            VStack(alignment: .leading, spacing: 4) {
                Text(language.text("行程码", "TRIP CODE"))
                    .font(.system(.caption2, design: .monospaced).weight(.medium))
                    .tracking(1.1)
                    .foregroundStyle(.white.opacity(0.52))
                Text(trip.inviteCode)
                    .font(.system(.headline, design: .monospaced).weight(.medium))
                    .tracking(2)
                    .foregroundStyle(Color.ledgerGold)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
        }
    }

    private var tripIdentity: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(trip.name)
                .font(.system(.title2, design: .serif).weight(.bold))
                .foregroundStyle(.white)
                .lineLimit(usesAccessibilityLayout ? nil : 2)
                .fixedSize(horizontal: false, vertical: true)
            Text(trip.destination.isEmpty ? language.text("目的地待定", "Destination pending") : trip.destination)
                .font(.caption)
                .foregroundStyle(.white.opacity(0.62))
                .fixedSize(horizontal: false, vertical: true)
            Text(TripDates.range(start: trip.startDate, end: trip.endDate, language: language))
                .font(.caption)
                .foregroundStyle(.white.opacity(0.62))
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var tripCode: some View {
        VStack(alignment: .trailing, spacing: 5) {
            Text(language.text("行程码", "TRIP CODE"))
                .font(.system(size: 8, weight: .medium, design: .monospaced))
                .tracking(1.1)
                .foregroundStyle(.white.opacity(0.45))
            Text(trip.inviteCode)
                .font(.system(.headline, design: .monospaced).weight(.medium))
                .tracking(2)
                .foregroundStyle(Color.ledgerGold)
        }
    }

    @ViewBuilder
    private var metrics: some View {
        if usesAccessibilityLayout {
            VStack(spacing: 0) {
                accessibilityMetric(
                    language.text("人均", "Per person"),
                    Money.string(cents: snapshot.summary.perPersonCents, currency: trip.currency, language: language)
                )
                accessibilityMetricDivider
                accessibilityMetric(
                    language.text("笔数", "Entries"),
                    "\(snapshot.summary.expenseCount)"
                )
                accessibilityMetricDivider
                accessibilityMetric(
                    language.text("待转账", "Transfers"),
                    "\(snapshot.settlements.count)"
                )
            }
        } else {
            HStack(spacing: 0) {
                heroMetric(
                    language.text("人均", "Per person"),
                    Money.string(cents: snapshot.summary.perPersonCents, currency: trip.currency, language: language)
                )
                heroDivider
                heroMetric(
                    language.text("笔数", "Entries"),
                    "\(snapshot.summary.expenseCount)"
                )
                heroDivider
                heroMetric(
                    language.text("待转账", "Transfers"),
                    "\(snapshot.settlements.count)"
                )
            }
        }
    }

    private func accessibilityMetric(_ label: String, _ value: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 16) {
            Text(label)
                .font(.caption)
                .foregroundStyle(.white.opacity(0.54))
            Spacer(minLength: 12)
            Text(value)
                .font(.system(.body, design: .monospaced).weight(.semibold))
                .foregroundStyle(.white)
                .multilineTextAlignment(.trailing)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.vertical, 11)
    }

    private var accessibilityMetricDivider: some View {
        Rectangle()
            .fill(.white.opacity(0.12))
            .frame(height: 1)
    }

    private func heroMetric(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption2)
                .foregroundStyle(.white.opacity(0.48))
            Text(value)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var heroDivider: some View {
        Rectangle()
            .fill(.white.opacity(0.16))
            .frame(width: 1, height: 34)
            .padding(.horizontal, 10)
    }
}

private struct CategoryTotalRow: View {
    let category: String
    let amount: Int
    let maximum: Int
    let currency: String
    let language: AppLanguage

    var body: some View {
        HStack(spacing: 12) {
            CategoryGlyph(category: category, size: 36)

            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(TripCopy.categoryName(category, language: language))
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(Color.ledgerInk)
                    Spacer()
                    Text(Money.string(cents: amount, currency: currency, language: language))
                        .font(.system(.caption, design: .monospaced).weight(.medium))
                        .foregroundStyle(Color.ledgerInk)
                }

                GeometryReader { proxy in
                    ZStack(alignment: .leading) {
                        Capsule().fill(Color.ledgerLine.opacity(0.35))
                        Capsule()
                            .fill(categoryColor(category))
                            .frame(width: max(6, proxy.size.width * CGFloat(amount) / CGFloat(maximum)))
                    }
                }
                .frame(height: 5)
            }
        }
    }
}

struct ExpenseListRow: View {
    let expense: Expense
    let payerName: String
    let currency: String
    let language: AppLanguage
    var showsDelete = false
    var delete: (() -> Void)?

    var body: some View {
        HStack(spacing: 12) {
            CategoryGlyph(category: expense.category, size: 42)

            VStack(alignment: .leading, spacing: 5) {
                Text(expense.title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.ledgerInk)
                    .lineLimit(1)
                Text(
                    language.text(
                        "\(TripDates.display(expense.date, language: language)) · \(payerName)垫付",
                        "\(TripDates.display(expense.date, language: language)) · Paid by \(payerName)"
                    )
                )
                .font(.caption)
                .foregroundStyle(Color.ledgerSecondary)
                .lineLimit(1)
            }

            Spacer(minLength: 8)

            VStack(alignment: .trailing, spacing: 4) {
                Text(Money.string(cents: expense.amountCents, currency: currency, language: language))
                    .font(.system(.subheadline, design: .monospaced).weight(.semibold))
                    .foregroundStyle(Color.ledgerInk)
                    .lineLimit(1)
                Text(
                    expense.splitMode == .equal
                        ? language.text("\(expense.shares.count) 人均分", "Split \(expense.shares.count) ways")
                        : language.text("指定金额", "Custom split")
                )
                .font(.caption2)
                .foregroundStyle(Color.ledgerSecondary)
            }

            if showsDelete, let delete {
                Button(role: .destructive, action: delete) {
                    Image(systemName: "trash")
                        .font(.caption)
                }
                .buttonStyle(.borderless)
                .accessibilityLabel(language.text("删除支出", "Delete expense"))
            }
        }
        .padding(.vertical, 10)
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }
}

func categoryColor(_ category: String) -> Color {
    switch category {
    case "餐饮": .ledgerOrange
    case "住宿": .ledgerTeal
    case "交通": .ledgerBlue
    case "门票": .ledgerGold
    case "购物": .ledgerPurple
    default: .ledgerSecondary
    }
}
