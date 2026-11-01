import SwiftUI

struct ExpensesView: View {
    @Environment(AppModel.self) private var model

    let snapshot: TripSnapshot
    let addExpense: () -> Void

    @State private var query = ""
    @State private var category = "全部"
    @State private var pendingDeletion: Expense?
    @State private var errorText: String?

    private var language: AppLanguage { model.language }
    private var currency: String { snapshot.trip.currency }

    private var filteredExpenses: [Expense] {
        let normalized = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return snapshot.expenses
            .filter { expense in
                let matchesCategory = category == "全部" || expense.category == category
                let matchesQuery = normalized.isEmpty
                    || expense.title.lowercased().contains(normalized)
                    || expense.notes.lowercased().contains(normalized)
                return matchesCategory && matchesQuery
            }
            .sorted { $0.date > $1.date }
    }

    private var groups: [(date: String, expenses: [Expense])] {
        Dictionary(grouping: filteredExpenses, by: \.date)
            .map { (date: $0.key, expenses: $0.value.sorted { $0.createdAt > $1.createdAt }) }
            .sorted { $0.date > $1.date }
    }

    private var total: Int {
        filteredExpenses.reduce(0) { $0 + $1.amountCents }
    }

    var body: some View {
        List {
            Section {
                HStack(alignment: .firstTextBaseline, spacing: 12) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(language.text("筛选合计", "Filtered total"))
                            .font(.caption)
                            .foregroundStyle(Color.ledgerSecondary)
                        Text(Money.string(cents: total, currency: currency, language: language))
                            .font(.system(.title2, design: .monospaced).weight(.semibold))
                            .foregroundStyle(Color.ledgerInk)
                            .contentTransition(.numericText())
                    }
                    Spacer()
                    Text(language.count(filteredExpenses.count, "笔", "expense", "expenses"))
                        .font(.caption.weight(.medium))
                        .foregroundStyle(Color.ledgerSecondary)
                }
                .padding(.vertical, 4)
            }

            Section {
                categoryBar
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
            }

            if groups.isEmpty {
                Section {
                    EmptyLedgerView(
                        symbol: "magnifyingglass",
                        title: language.text("没有匹配的支出", "No matching expenses"),
                        message: language.text("换个关键词，或者查看全部分类。", "Try another search or show every category."),
                        actionTitle: language.text("清除筛选", "Clear filters"),
                        action: {
                            query = ""
                            category = "全部"
                        }
                    )
                    .listRowInsets(EdgeInsets())
                }
            } else {
                ForEach(groups, id: \.date) { group in
                    Section {
                        ForEach(group.expenses) { expense in
                            ExpenseListRow(
                                expense: expense,
                                payerName: snapshot.members.first(where: { $0.id == expense.paidBy })?.name
                                    ?? language.text("未知", "Unknown"),
                                currency: currency,
                                language: language
                            )
                            .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                Button(role: .destructive) {
                                    pendingDeletion = expense
                                } label: {
                                    Label(language.text("删除", "Delete"), systemImage: "trash")
                                }
                            }
                        }
                    } header: {
                        Text(TripDates.display(group.date, language: language, long: true))
                            .textCase(nil)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(LedgerBackground())
        .navigationTitle(language.text("支出明细", "Expenses"))
        .navigationBarTitleDisplayMode(.large)
        .searchable(
            text: $query,
            placement: .navigationBarDrawer(displayMode: .always),
            prompt: Text(language.text("搜索支出", "Search expenses"))
        )
        .refreshable {
            await model.refresh()
        }
        .confirmationDialog(
            language.text("删除这笔支出？", "Delete this expense?"),
            isPresented: Binding(
                get: { pendingDeletion != nil },
                set: { if !$0 { pendingDeletion = nil } }
            ),
            titleVisibility: .visible,
            presenting: pendingDeletion
        ) { expense in
            Button(language.text("删除", "Delete"), role: .destructive) {
                delete(expense)
            }
            Button(language.text("取消", "Cancel"), role: .cancel) {
                pendingDeletion = nil
            }
        } message: { expense in
            Text(language.text("“\(expense.title)”会从共享账本中移除，并重新计算所有人的结算。", "\(expense.title) will be removed and every balance will be recalculated."))
        }
        .alert(
            language.text("删除失败", "Could not delete"),
            isPresented: Binding(
                get: { errorText != nil },
                set: { if !$0 { errorText = nil } }
            )
        ) {
            Button(language.text("好", "OK"), role: .cancel) {}
        } message: {
            Text(errorText ?? "")
        }
    }

    private var categoryBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                categoryChip("全部", title: language.text("全部", "All"))
                ForEach(TripCopy.categories, id: \.value) { item in
                    categoryChip(item.value, title: language.text(item.zh, item.en))
                }
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 2)
        }
    }

    private func categoryChip(_ value: String, title: String) -> some View {
        Button {
            withAnimation(.snappy(duration: 0.2)) {
                category = value
            }
        } label: {
            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundStyle(category == value ? .white : Color.ledgerSecondary)
                .padding(.horizontal, 13)
                .frame(minHeight: 34)
                .background(category == value ? Color.ledgerForest : Color.ledgerSurface)
                .clipShape(Capsule())
                .overlay {
                    Capsule()
                        .stroke(category == value ? Color.clear : Color.ledgerLine, lineWidth: 1)
                }
        }
        .buttonStyle(PressableButtonStyle())
        .accessibilityAddTraits(category == value ? .isSelected : [])
    }

    private func delete(_ expense: Expense) {
        pendingDeletion = nil
        Task {
            do {
                try await model.deleteExpense(expense)
            } catch {
                errorText = TripCopy.localizedError(error, language: language)
            }
        }
    }
}
