import SwiftUI

struct SettlementsView: View {
    @Environment(AppModel.self) private var model

    let snapshot: TripSnapshot

    private var language: AppLanguage { model.language }
    private var trip: Trip { snapshot.trip }
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
        HStack(alignment: .center, spacing: 18) {
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

            Spacer(minLength: 0)

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
        }
        .padding(20)
        .background(Color.ledgerGoldSoft)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(Color.ledgerGold.opacity(0.45), lineWidth: 1)
        }
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
    let settlement: Settlement
    let trip: Trip
    let language: AppLanguage

    var body: some View {
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
                ShareLink(
                    item: TripSharing.settlementText(settlement, trip: trip, language: language)
                ) {
                    Image(systemName: "square.and.arrow.up")
                        .font(.caption.weight(.semibold))
                        .frame(width: 32, height: 28)
                }
                .accessibilityLabel(language.text("分享结算提醒", "Share payment reminder"))
            }
        }
        .padding(.vertical, 13)
    }
}

private struct BalanceRow: View {
    let balance: MemberBalance
    let maximum: Int
    let currency: String
    let language: AppLanguage

    private var isPositive: Bool { balance.netCents >= 0 }

    var body: some View {
        HStack(spacing: 12) {
            AvatarView(name: balance.name, color: balance.color, size: 38)

            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
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
                        .lineLimit(1)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(
                            isPositive
                                ? language.text("应收", "Gets back")
                                : language.text("应付", "Owes")
                        )
                        .font(.caption2)
                        .foregroundStyle(Color.ledgerSecondary)
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
                    }
                }

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
        .padding(.vertical, 12)
        .accessibilityElement(children: .combine)
    }
}
