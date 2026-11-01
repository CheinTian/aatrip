import SwiftUI

struct SettlementsView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    let snapshot: TripSnapshot

    private var language: AppLanguage { model.language }
    private var trip: Trip { snapshot.trip }
    private var usesAccessibilityLayout: Bool { dynamicTypeSize.isAccessibilitySize }
    private var maximumBalance: Int {
        max(1, snapshot.balances.map { abs($0.netCents) }.max() ?? 1)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                settlementBoard
                transferCard
                balanceCard
            }
            .padding(.horizontal, 18)
            .padding(.top, 8)
            .padding(.bottom, 30)
            .frame(maxWidth: 840)
            .frame(maxWidth: .infinity)
        }
        .background(LedgerBackground())
        .navigationTitle(language.text("谁该补多少", "Settle up"))
        .navigationBarTitleDisplayMode(.large)
        .refreshable {
            await model.refresh()
        }
    }

    private var settlementBoard: some View {
        Group {
            if usesAccessibilityLayout {
                VStack(alignment: .leading, spacing: 18) {
                    settlementSummary
                    accessibilityCountBadge
                }
            } else {
                HStack(alignment: .center, spacing: 18) {
                    settlementSummary

                    Spacer(minLength: 0)

                    settlementStamp
                }
            }
        }
        .padding(20)
        .background(Color.ledgerGoldSoft)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(Color.ledgerGold.opacity(0.45), lineWidth: 1)
        }
    }

    private var settlementSummary: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(
                snapshot.settlements.isEmpty
                    ? language.text("目前账目已经结平。", "Everything is settled.")
                    : language.text("这几笔转完，大家就两清了。", "These transfers clear the ledger.")
            )
            .font(.system(.title2, design: .serif).weight(.bold))
            .foregroundStyle(Color.ledgerInk)
            .fixedSize(horizontal: false, vertical: true)

            Text(language.text("按最少笔数计算，不影响每个人的实际消费记录。", "Calculated with the fewest transfers. Every expense stays unchanged."))
                .font(.caption)
                .foregroundStyle(Color.ledgerSecondary)
                .lineSpacing(3)
        }
    }

    private var settlementStamp: some View {
        VStack(spacing: 3) {
            Text("\(snapshot.settlements.count)")
                .font(.system(size: 38, weight: .bold, design: .serif))
                .foregroundStyle(Color.ledgerInk)
            Text(language.text("笔待转账", "to send"))
                .font(.caption2)
                .foregroundStyle(Color.ledgerSecondary)
        }
        .frame(width: 88, height: 88)
        .overlay {
            Circle().stroke(Color.ledgerInk.opacity(0.55), lineWidth: 1)
        }
        .rotationEffect(.degrees(4))
        .accessibilityElement(children: .combine)
    }

    private var accessibilityCountBadge: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text("\(snapshot.settlements.count)")
                .font(.system(.title2, design: .serif).weight(.bold))
            Text(language.text("笔待转账", "to send"))
                .font(.subheadline)
        }
        .foregroundStyle(Color.ledgerInk)
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Color.ledgerSurface.opacity(0.58))
        .clipShape(Capsule())
        .overlay {
            Capsule().stroke(Color.ledgerInk.opacity(0.42), lineWidth: 1)
        }
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder
    private var transferCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionTitle(title: language.text("建议转账", "Suggested transfers"))

            if snapshot.settlements.isEmpty {
                EmptyLedgerView(
                    symbol: "checkmark.seal.fill",
                    title: language.text("无需转账", "No transfers needed"),
                    message: language.text("所有人的垫付和分摊刚好平衡。", "Everyone's payments and shares are balanced.")
                )
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(snapshot.settlements.enumerated()), id: \.element.id) { index, settlement in
                        SettlementRow(
                            settlement: settlement,
                            trip: trip,
                            language: language
                        )
                        if index < snapshot.settlements.count - 1 {
                            Divider().overlay(Color.ledgerLine)
                        }
                    }
                }
            }
        }
        .paperCard()
    }

    private var balanceCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionTitle(title: language.text("每人净额", "Net balance"))

            VStack(spacing: 0) {
                ForEach(Array(snapshot.balances.enumerated()), id: \.element.id) { index, balance in
                    BalanceRow(
                        balance: balance,
                        maximum: maximumBalance,
                        currency: trip.currency,
                        language: language
                    )
                    if index < snapshot.balances.count - 1 {
                        Divider()
                            .overlay(Color.ledgerLine)
                            .padding(.leading, 48)
                    }
                }
            }
        }
        .paperCard()
    }
}

private struct SettlementRow: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    let settlement: Settlement
    let trip: Trip
    let language: AppLanguage

    var body: some View {
        Group {
            if dynamicTypeSize.isAccessibilitySize {
                accessibilityLayout
            } else {
                regularLayout
            }
        }
        .padding(.vertical, 13)
    }

    private var regularLayout: some View {
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    AvatarView(name: settlement.fromName, color: "#5D6B64", size: 32)
                    Text(settlement.fromName)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color.ledgerInk)
                        .lineLimit(1)
                }
                Text(language.text("付款", "Pays"))
                    .font(.caption2)
                    .foregroundStyle(Color.ledgerSecondary)
                    .padding(.leading, 40)
            }

            Image(systemName: "arrow.right")
                .font(.caption.weight(.bold))
                .foregroundStyle(Color.ledgerOrange)
                .frame(width: 28)

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    AvatarView(name: settlement.toName, color: "#E5A72D", size: 32)
                    Text(settlement.toName)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color.ledgerInk)
                        .lineLimit(1)
                }
                Text(language.text("收款", "Receives"))
                    .font(.caption2)
                    .foregroundStyle(Color.ledgerSecondary)
                    .padding(.leading, 40)
            }

            Spacer(minLength: 6)

            VStack(alignment: .trailing, spacing: 4) {
                Text(Money.string(cents: settlement.amountCents, currency: trip.currency, language: language))
                    .font(.system(.subheadline, design: .monospaced).weight(.semibold))
                    .foregroundStyle(Color.ledgerInk)
                    .lineLimit(1)
                shareButton
            }
        }
    }

    private var accessibilityLayout: some View {
        VStack(alignment: .leading, spacing: 14) {
            settlementParty(
                name: settlement.fromName,
                color: "#5D6B64",
                role: language.text("付款", "Pays")
            )

            settlementParty(
                name: settlement.toName,
                color: "#E5A72D",
                role: language.text("收款", "Receives")
            )

            HStack(alignment: .center, spacing: 12) {
                Text(Money.string(cents: settlement.amountCents, currency: trip.currency, language: language))
                    .font(.system(.headline, design: .monospaced).weight(.semibold))
                    .foregroundStyle(Color.ledgerInk)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 8)
                shareButton
            }
        }
    }

    private func settlementParty(name: String, color: String, role: String) -> some View {
        HStack(spacing: 10) {
            AvatarView(name: name, color: color, size: 36)
            VStack(alignment: .leading, spacing: 3) {
                Text(name)
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(Color.ledgerInk)
                    .fixedSize(horizontal: false, vertical: true)
                Text(role)
                    .font(.caption)
                    .foregroundStyle(Color.ledgerSecondary)
            }
        }
    }

    private var shareButton: some View {
        ShareLink(
            item: TripSharing.tripURL(trip),
            subject: Text(language.text("AA簿结算提醒", "AA Ledger payment reminder")),
            message: Text(TripSharing.settlementText(settlement, trip: trip, language: language))
        ) {
            Image(systemName: "square.and.arrow.up")
                .font(.body.weight(.semibold))
                .frame(width: 44, height: 44)
        }
        .accessibilityLabel(language.text("分享结算提醒", "Share payment reminder"))
    }
}

private struct BalanceRow: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    let balance: MemberBalance
    let maximum: Int
    let currency: String
    let language: AppLanguage

    private var isPositive: Bool { balance.netCents >= 0 }
    private var usesAccessibilityLayout: Bool { dynamicTypeSize.isAccessibilitySize }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            AvatarView(name: balance.name, color: balance.color, size: 38)

            VStack(alignment: .leading, spacing: 8) {
                if usesAccessibilityLayout {
                    balanceIdentity

                    HStack(alignment: .firstTextBaseline) {
                        balanceLabel
                        Spacer(minLength: 12)
                        balanceAmount
                    }
                } else {
                    HStack(alignment: .top) {
                        balanceIdentity
                        Spacer(minLength: 12)
                        VStack(alignment: .trailing, spacing: 2) {
                            balanceLabel
                            balanceAmount
                        }
                    }
                }

                balanceBar
            }
        }
        .padding(.vertical, 12)
        .accessibilityElement(children: .combine)
    }

    private var balanceIdentity: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(balance.name)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Color.ledgerInk)
            Text(
                language.text(
                    "垫付 \(Money.string(cents: balance.paidCents, currency: currency, language: language)) · 应摊 \(Money.string(cents: balance.owedCents, currency: currency, language: language))",
                    "Paid \(Money.string(cents: balance.paidCents, currency: currency, language: language)) · Share \(Money.string(cents: balance.owedCents, currency: currency, language: language))"
                )
            )
            .font(.caption2)
            .foregroundStyle(Color.ledgerSecondary)
            .lineLimit(usesAccessibilityLayout ? nil : 1)
            .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var balanceLabel: some View {
        Text(
            isPositive
                ? language.text("应收", "Gets back")
                : language.text("应付", "Owes")
        )
        .font(.caption2)
        .foregroundStyle(Color.ledgerSecondary)
    }

    private var balanceAmount: some View {
        Text(
            Money.string(
                cents: balance.netCents,
                currency: currency,
                language: language,
                signed: true
            )
        )
        .font(.system(.caption, design: .monospaced).weight(.semibold))
        .foregroundStyle(isPositive ? Color.ledgerTeal : Color.ledgerRed)
        .fixedSize(horizontal: false, vertical: true)
    }

    private var balanceBar: some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                Capsule().fill(Color.ledgerLine.opacity(0.35))
                Capsule()
                    .fill(isPositive ? Color.ledgerTeal : Color.ledgerOrange)
                    .frame(
                        width: max(
                            5,
                            proxy.size.width * CGFloat(abs(balance.netCents)) / CGFloat(maximum)
                        )
                    )
            }
        }
        .frame(height: 4)
    }
}
