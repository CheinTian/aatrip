import SwiftUI

struct WelcomeView: View {
    private enum BusyAction {
        case demo
    }

    @Environment(AppModel.self) private var model
    @ScaledMetric(relativeTo: .largeTitle) private var heroSize: CGFloat = 48
    @State private var showsCreate = false
    @State private var showsJoin = false
    @State private var busyAction: BusyAction?
    @State private var errorText: String?

    private var language: AppLanguage { model.language }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                header
                    .padding(.top, 8)

                story
                    .padding(.top, 34)

                routeCard
                    .padding(.top, 28)

                benefitRow
                    .padding(.top, 18)

                actions
                    .padding(.top, 28)

                if let lastTripId = model.lastTripId {
                    Button {
                        Task { await model.openTrip(lastTripId) }
                    } label: {
                        HStack(spacing: 7) {
                            Image(systemName: "arrow.uturn.backward")
                            Text(language.text("继续上次行程", "Resume last trip"))
                        }
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color.ledgerSecondary)
                    }
                    .buttonStyle(PressableButtonStyle())
                    .frame(maxWidth: .infinity)
                    .padding(.top, 18)
                }

                footer
                    .padding(.top, 42)
                    .padding(.bottom, 20)
            }
            .padding(.horizontal, 22)
            .frame(maxWidth: 720)
            .frame(maxWidth: .infinity)
        }
        .background(LedgerBackground())
        .sheet(isPresented: $showsCreate) {
            CreateTripSheet(language: language)
                .environment(model)
        }
        .sheet(isPresented: $showsJoin) {
            JoinTripSheet()
                .environment(model)
        }
        .alert(
            language.text("没有完成", "Something went wrong"),
            isPresented: Binding(
                get: { errorText != nil },
                set: { if !$0 { errorText = nil } }
            )
        ) {
            Button(language.text("好", "OK"), role: .cancel) {}
        } message: {
            Text(errorText ?? "")
        }
        .task {
            #if DEBUG
            if ProcessInfo.processInfo.environment["AATRIP_OPEN_CREATE"] == "1" {
                showsCreate = true
            } else if ProcessInfo.processInfo.environment["AATRIP_OPEN_JOIN"] == "1" {
                showsJoin = true
            }
            #endif
        }
    }

    private var header: some View {
        HStack(spacing: 12) {
            BrandLockup()
            Spacer()
            Menu {
                ForEach(AppLanguage.allCases) { option in
                    Button {
                        model.setLanguage(option)
                    } label: {
                        if option == language {
                            Label(option.displayName, systemImage: "checkmark")
                        } else {
                            Text(option.displayName)
                        }
                    }
                }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "globe")
                    Text(language.shortLabel)
                        .font(.system(.caption, design: .monospaced).weight(.semibold))
                }
                .foregroundStyle(Color.ledgerInk)
                .frame(minWidth: 54, minHeight: 44)
                .padding(.horizontal, 4)
                .background(Color.ledgerSurface.opacity(0.78))
                .clipShape(Capsule())
                .overlay {
                    Capsule().stroke(Color.ledgerLine, lineWidth: 1)
                }
            }
            .accessibilityLabel(language.text("切换语言", "Change language"))
        }
    }

    private var story: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text(
                language == .zhHans
                    ? "一起出发，\n也要一起算清。"
                    : "Go together.\nSettle together."
            )
            .font(.system(size: heroSize, weight: .black, design: .serif))
            .tracking(-1.2)
            .foregroundStyle(Color.ledgerInk)
            .fixedSize(horizontal: false, vertical: true)

            Text(
                language.text(
                    "订房、包车、吃饭、买票。每一笔都记在原地，谁先垫付、谁该补多少，一眼明白。",
                    "Hotels, rides, meals, tickets. Keep every shared cost in one place and know exactly who owes whom."
                )
            )
            .font(.body)
            .foregroundStyle(Color.ledgerSecondary)
            .lineSpacing(5)
            .frame(maxWidth: 560, alignment: .leading)
        }
        .accessibilityElement(children: .combine)
    }

    private var routeCard: some View {
        VStack(alignment: .leading, spacing: 24) {
            HStack {
                Label(
                    language.text("本次路线", "This route"),
                    systemImage: "point.topleft.down.to.point.bottomright.curvepath"
                )
                .font(.system(.caption, design: .monospaced).weight(.medium))
                .foregroundStyle(.white.opacity(0.74))
                Spacer()
                Text(language.text("自由行", "Independent"))
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(Color.ledgerGold)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .overlay {
                        Capsule().stroke(Color.ledgerGold.opacity(0.6), lineWidth: 1)
                    }
            }

            RouteTrack(
                destination: language.text("大理 · 丽江", "Dali · Lijiang"),
                startDate: "2026-10-18",
                endDate: "2026-10-24",
                language: language
            )
        }
        .padding(20)
        .background {
            ZStack {
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
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(alignment: .topTrailing) {
            Circle()
                .stroke(.white.opacity(0.08), lineWidth: 22)
                .frame(width: 150, height: 150)
                .offset(x: 58, y: -58)
                .accessibilityHidden(true)
        }
        .shadow(color: .ledgerForest.opacity(0.18), radius: 22, y: 12)
    }

    private var benefitRow: some View {
        HStack(spacing: 0) {
            benefit("equal.circle", language.text("自动结算", "Auto settle"))
            Spacer()
            benefit("person.2.fill", language.text("多人共享", "Shared"))
            Spacer()
            benefit("list.bullet.rectangle", language.text("每日明细", "Daily detail"))
        }
        .foregroundStyle(Color.ledgerSecondary)
        .padding(.horizontal, 4)
    }

    private func benefit(_ symbol: String, _ title: String) -> some View {
        Label(title, systemImage: symbol)
            .font(.caption.weight(.medium))
            .labelStyle(.titleAndIcon)
    }

    private var actions: some View {
        VStack(spacing: 11) {
            Button {
                showsCreate = true
            } label: {
                Label(language.text("建立旅行账本", "Create a trip ledger"), systemImage: "plus")
            }
            .buttonStyle(PrimaryActionStyle())
            .disabled(busyAction != nil || model.isWorking)

            HStack(spacing: 10) {
                Button {
                    showsJoin = true
                } label: {
                    Label(language.text("输入行程码", "Join with code"), systemImage: "number")
                }
                .buttonStyle(SecondaryActionStyle())

                Button {
                    runDemo()
                } label: {
                    Group {
                        if busyAction == .demo {
                            ProgressView()
                                .tint(Color.ledgerInk)
                        } else {
                            Label(language.text("看看示例", "Try sample"), systemImage: "sparkles")
                        }
                    }
                    .frame(maxWidth: .infinity, minHeight: 50)
                }
                .buttonStyle(SecondaryActionStyle())
                .disabled(busyAction != nil || model.isWorking)
            }
        }
    }

    private var footer: some View {
        VStack(spacing: 12) {
            Rectangle()
                .fill(Color.ledgerLine)
                .frame(height: 1)

            HStack(spacing: 16) {
                Text("AA")
                    .font(.system(.caption, design: .monospaced).weight(.medium))
                Text(language.text("旅行一起走，账单也一起算。", "Travel together. Settle together."))
                    .font(.caption)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Text("2026")
                    .font(.system(.caption2, design: .monospaced))
            }
            .foregroundStyle(Color.ledgerSecondary)

            if let stats = model.visitStats {
                HStack(spacing: 18) {
                    Label(
                        "\(language.text("总访问", "Visitors")) \(stats.totalVisitors)",
                        systemImage: "person.2"
                    )
                    Label(
                        "\(language.text("今日", "Today")) \(stats.todayVisitors)",
                        systemImage: "calendar"
                    )
                }
                .font(.caption2)
                .foregroundStyle(Color.ledgerSecondary)
                .frame(maxWidth: .infinity, alignment: .trailing)
            }
        }
    }

    private func runDemo() {
        guard busyAction == nil else { return }
        busyAction = .demo
        Task {
            do {
                try await model.startDemo()
            } catch {
                errorText = TripCopy.localizedError(error, language: language)
            }
            busyAction = nil
        }
    }
}
