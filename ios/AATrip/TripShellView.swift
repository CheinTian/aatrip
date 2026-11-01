import SwiftUI

enum TripTab: Hashable {
    case overview
    case expenses
    case settlements
    case members
}

struct TripShellView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.scenePhase) private var scenePhase
    @State private var selectedTab: TripTab = .overview
    @State private var showsExpenseEditor = false

    let snapshot: TripSnapshot

    private var language: AppLanguage { model.language }

    init(snapshot: TripSnapshot) {
        self.snapshot = snapshot
        #if DEBUG
        let initialTab = ProcessInfo.processInfo.environment["AATRIP_INITIAL_TAB"]
        let parsedTab: TripTab = switch initialTab {
        case "expenses": .expenses
        case "settlements": .settlements
        case "members": .members
        default: .overview
        }
        _selectedTab = State(initialValue: parsedTab)
        _showsExpenseEditor = State(
            initialValue: ProcessInfo.processInfo.environment["AATRIP_OPEN_EXPENSE_EDITOR"] == "1"
        )
        #endif
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationStack {
                DashboardView(
                    snapshot: snapshot,
                    showExpenses: { selectedTab = .expenses },
                    showSettlements: { selectedTab = .settlements },
                    addExpense: { showsExpenseEditor = true }
                )
                .tripToolbar(snapshot: snapshot, addExpense: { showsExpenseEditor = true })
            }
            .tabItem {
                Label(language.text("总览", "Overview"), systemImage: "rectangle.3.group.fill")
            }
            .tag(TripTab.overview)

            NavigationStack {
                ExpensesView(
                    snapshot: snapshot,
                    addExpense: { showsExpenseEditor = true }
                )
                .tripToolbar(snapshot: snapshot, addExpense: { showsExpenseEditor = true })
            }
            .tabItem {
                Label(language.text("支出", "Expenses"), systemImage: "list.bullet.rectangle.fill")
            }
            .tag(TripTab.expenses)

            NavigationStack {
                SettlementsView(snapshot: snapshot)
                    .tripToolbar(snapshot: snapshot, addExpense: { showsExpenseEditor = true })
            }
            .tabItem {
                Label(language.text("结算", "Settle"), systemImage: "arrow.left.arrow.right")
            }
            .tag(TripTab.settlements)

            NavigationStack {
                MembersView(snapshot: snapshot)
                    .tripToolbar(snapshot: snapshot, addExpense: { showsExpenseEditor = true })
            }
            .tabItem {
                Label(language.text("成员", "Travelers"), systemImage: "person.2.fill")
            }
            .tag(TripTab.members)
        }
        .tint(Color.ledgerOrange)
        .sheet(isPresented: $showsExpenseEditor) {
            ExpenseEditorView(snapshot: snapshot)
                .environment(model)
        }
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(30))
                guard !Task.isCancelled else { break }
                await model.refresh(quiet: true)
            }
        }
        .onChange(of: scenePhase) { _, next in
            if next == .active {
                Task { await model.refresh(quiet: true) }
            }
        }
    }
}

private struct TripToolbarModifier: ViewModifier {
    @Environment(AppModel.self) private var model

    let snapshot: TripSnapshot
    let addExpense: () -> Void

    private var language: AppLanguage { model.language }

    func body(content: Content) -> some View {
        content.toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button(action: addExpense) {
                    Image(systemName: "plus")
                        .fontWeight(.semibold)
                }
                .accessibilityLabel(language.text("记一笔", "Add expense"))

                Menu {
                    Section(snapshot.trip.name) {
                        Button {
                            UIPasteboard.general.string = snapshot.trip.inviteCode
                            model.showToast(language.text("行程码已复制", "Trip code copied"))
                        } label: {
                            Label(
                                language.text("复制行程码 \(snapshot.trip.inviteCode)", "Copy code \(snapshot.trip.inviteCode)"),
                                systemImage: "doc.on.doc"
                            )
                        }

                        ShareLink(
                            item: TripSharing.tripURL(snapshot.trip),
                            subject: Text(language.text("AA簿邀请", "AA Ledger invite")),
                            message: Text(TripSharing.inviteMessage(snapshot.trip, language: language))
                        ) {
                            Label(language.text("分享邀请", "Share invite"), systemImage: "square.and.arrow.up")
                        }
                    }

                    Divider()

                    Button {
                        model.leaveTrip()
                    } label: {
                        Label(language.text("返回首页", "Back home"), systemImage: "house")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
                .accessibilityLabel(language.text("行程菜单", "Trip menu"))
            }
        }
    }
}

extension View {
    func tripToolbar(snapshot: TripSnapshot, addExpense: @escaping () -> Void) -> some View {
        modifier(TripToolbarModifier(snapshot: snapshot, addExpense: addExpense))
    }
}

enum TripSharing {
    static func tripURL(_ trip: Trip) -> URL {
        URL(string: "https://aatrip.chein0813843.workers.dev/#/trip/\(trip.id)")!
    }

    static func inviteMessage(_ trip: Trip, language: AppLanguage) -> String {
        language.text(
            "AA簿邀请：\(trip.name)\n行程码：\(trip.inviteCode)",
            "AA Ledger invite: \(trip.name)\nTrip code: \(trip.inviteCode)"
        )
    }

    static func settlementText(
        _ settlement: Settlement,
        trip: Trip,
        language: AppLanguage
    ) -> String {
        let amount = Money.string(
            cents: settlement.amountCents,
            currency: trip.currency,
            language: language
        )
        return language.text(
            "AA簿结算提醒：\(settlement.fromName) 向 \(settlement.toName) 转账 \(amount)。",
            "AA Ledger reminder: \(settlement.fromName) pays \(settlement.toName) \(amount)."
        )
    }
}
