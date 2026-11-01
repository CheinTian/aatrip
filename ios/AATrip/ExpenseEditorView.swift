import SwiftUI

struct ExpenseEditorView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @FocusState private var amountFocused: Bool

    let snapshot: TripSnapshot

    @State private var title = ""
    @State private var amountText = ""
    @State private var category = "餐饮"
    @State private var paidBy: String
    @State private var date = Date()
    @State private var notes = ""
    @State private var splitMode: SplitMode = .equal
    @State private var participants: Set<String>
    @State private var customAmounts: [String: String]
    @State private var isSaving = false
    @State private var errorText: String?

    init(snapshot: TripSnapshot) {
        self.snapshot = snapshot
        let ids = snapshot.members.map(\.id)
        _paidBy = State(initialValue: ids.first ?? "")
        _participants = State(initialValue: Set(ids))
        _customAmounts = State(initialValue: Dictionary(uniqueKeysWithValues: ids.map { ($0, "") }))
    }

    private var language: AppLanguage { model.language }
    private var trip: Trip { snapshot.trip }
    private var amountCents: Int { Money.cents(from: amountText) }
    private var symbol: String { Money.symbol(for: trip.currency) }

    private var equalShares: [String: Int] {
        guard amountCents > 0, !participants.isEmpty else { return [:] }
        let ordered = snapshot.members.map(\.id).filter { participants.contains($0) }
        let base = amountCents / ordered.count
        var remainder = amountCents - base * ordered.count
        var result: [String: Int] = [:]
        for id in ordered {
            result[id] = base + (remainder > 0 ? 1 : 0)
            remainder = max(0, remainder - 1)
        }
        return result
    }

    private var customTotal: Int {
        snapshot.members.reduce(0) {
            $0 + Money.cents(from: customAmounts[$1.id] ?? "")
        }
    }

    private var estimatedPerPerson: Int {
        guard !participants.isEmpty, amountCents > 0 else { return 0 }
        return Int((Double(amountCents) / Double(participants.count)).rounded())
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text(symbol)
                            .font(.system(.title2, design: .monospaced).weight(.semibold))
                            .foregroundStyle(Color.ledgerSecondary)
                        TextField("0.00", text: $amountText)
                            .font(.system(size: 42, weight: .semibold, design: .monospaced))
                            .keyboardType(.decimalPad)
                            .focused($amountFocused)
                            .minimumScaleFactor(0.6)
                            .accessibilityLabel(language.text("支出金额", "Expense amount"))
                    }
                    .padding(.vertical, 8)

                    HStack {
                        Label(language.text("人均预估", "Estimated each"), systemImage: "person.2")
                            .font(.caption)
                            .foregroundStyle(Color.ledgerSecondary)
                        Spacer()
                        Text(
                            splitMode == .equal
                                ? Money.string(
                                    cents: estimatedPerPerson,
                                    currency: trip.currency,
                                    language: language
                                )
                                : Money.string(
                                    cents: customTotal,
                                    currency: trip.currency,
                                    language: language
                                )
                        )
                        .font(.system(.caption, design: .monospaced).weight(.semibold))
                        .foregroundStyle(Color.ledgerInk)
                    }
                } header: {
                    Text(language.text("支出金额", "Amount"))
                }

                Section {
                    TextField(language.text("例如：环洱海包车", "e.g. Erhai Lake charter"), text: $title)
                        .textInputAutocapitalization(.sentences)
                        .submitLabel(.next)

                    categoryPicker
                        .listRowInsets(EdgeInsets(top: 12, leading: 16, bottom: 12, trailing: 16))

                    Picker(language.text("谁先垫付", "Paid by"), selection: $paidBy) {
                        ForEach(snapshot.members) { member in
                            Text(member.name).tag(member.id)
                        }
                    }

                    DatePicker(
                        language.text("支出日期", "Date"),
                        selection: $date,
                        displayedComponents: .date
                    )
                } header: {
                    Text(language.text("支出信息", "Expense details"))
                }

                Section {
                    Picker(language.text("分摊方式", "Split"), selection: $splitMode) {
                        Text(language.text("平均分摊", "Equally")).tag(SplitMode.equal)
                        Text(language.text("指定金额", "Custom")).tag(SplitMode.custom)
                    }
                    .pickerStyle(.segmented)

                    if splitMode == .equal {
                        equalParticipantList
                    } else {
                        customSplitList
                    }
                } header: {
                    Text(language.text("怎么分摊", "How to split"))
                } footer: {
                    if splitMode == .custom {
                        Text(
                            language.text(
                                "已分配 \(Money.string(cents: customTotal, currency: trip.currency, language: language))，需等于 \(Money.string(cents: amountCents, currency: trip.currency, language: language))",
                                "Allocated \(Money.string(cents: customTotal, currency: trip.currency, language: language)); it must equal \(Money.string(cents: amountCents, currency: trip.currency, language: language))."
                            )
                        )
                        .foregroundStyle(customTotal == amountCents && amountCents > 0 ? Color.ledgerTeal : Color.ledgerSecondary)
                    }
                }

                Section {
                    TextField(
                        language.text("补充订单、地点或约定…", "Order, place, or other notes…"),
                        text: $notes,
                        axis: .vertical
                    )
                    .lineLimit(3...6)
                } header: {
                    Text(language.text("备注（选填）", "Notes (optional)"))
                }

                if let errorText {
                    Section {
                        Text(errorText)
                            .font(.subheadline)
                            .foregroundStyle(Color.ledgerRed)
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(LedgerBackground())
            .navigationTitle(language.text("记一笔共同支出", "Add shared expense"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(language.text("取消", "Cancel")) {
                        dismiss()
                    }
                    .disabled(isSaving)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        save()
                    } label: {
                        if isSaving {
                            ProgressView()
                        } else {
                            Text(language.text("保存", "Save"))
                                .fontWeight(.semibold)
                        }
                    }
                    .disabled(isSaving)
                }
            }
            .task {
                try? await Task.sleep(for: .milliseconds(300))
                amountFocused = true
            }
            .interactiveDismissDisabled(isSaving)
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    private var categoryPicker: some View {
        LazyVGrid(
            columns: [GridItem(.adaptive(minimum: 84), spacing: 8)],
            spacing: 8
        ) {
            ForEach(TripCopy.categories, id: \.value) { item in
                Button {
                    category = item.value
                } label: {
                    VStack(spacing: 6) {
                        Image(systemName: item.symbol)
                            .font(.system(size: 16, weight: .semibold))
                        Text(language.text(item.zh, item.en))
                            .font(.caption2.weight(.semibold))
                            .lineLimit(1)
                    }
                    .foregroundStyle(category == item.value ? .white : Color.ledgerSecondary)
                    .frame(maxWidth: .infinity, minHeight: 56)
                    .background(category == item.value ? Color.ledgerForest : Color.ledgerPaper)
                    .clipShape(RoundedRectangle(cornerRadius: 11, style: .continuous))
                    .overlay {
                        RoundedRectangle(cornerRadius: 11, style: .continuous)
                            .stroke(category == item.value ? Color.clear : Color.ledgerLine, lineWidth: 1)
                    }
                }
                .buttonStyle(PressableButtonStyle())
                .accessibilityAddTraits(category == item.value ? .isSelected : [])
            }
        }
    }

    private var equalParticipantList: some View {
        VStack(spacing: 0) {
            HStack {
                Text(language.text("参与分摊的人", "Participants"))
                    .font(.caption)
                    .foregroundStyle(Color.ledgerSecondary)
                Spacer()
                Button(
                    participants.count == snapshot.members.count
                        ? language.text("取消全选", "Deselect all")
                        : language.text("全选", "Select all")
                ) {
                    participants = participants.count == snapshot.members.count
                        ? []
                        : Set(snapshot.members.map(\.id))
                }
                .font(.caption.weight(.semibold))
            }
            .padding(.bottom, 8)

            ForEach(snapshot.members) { member in
                let selected = participants.contains(member.id)
                Button {
                    if selected {
                        participants.remove(member.id)
                    } else {
                        participants.insert(member.id)
                    }
                } label: {
                    HStack(spacing: 10) {
                        AvatarView(name: member.name, color: member.color, size: 34)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(member.name)
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(Color.ledgerInk)
                            Text(
                                selected
                                    ? Money.string(
                                        cents: equalShares[member.id] ?? 0,
                                        currency: trip.currency,
                                        language: language
                                    )
                                    : language.text("不参与", "Not included")
                            )
                            .font(.caption)
                            .foregroundStyle(Color.ledgerSecondary)
                        }
                        Spacer()
                        Image(systemName: selected ? "checkmark.circle.fill" : "circle")
                            .font(.title3)
                            .foregroundStyle(selected ? Color.ledgerTeal : Color.ledgerLine)
                    }
                    .contentShape(Rectangle())
                    .padding(.vertical, 7)
                }
                .buttonStyle(PressableButtonStyle())
                .accessibilityValue(selected ? language.text("参与分摊", "Included") : language.text("不参与", "Not included"))

                if member.id != snapshot.members.last?.id {
                    Divider().overlay(Color.ledgerLine).padding(.leading, 44)
                }
            }
        }
    }

    private var customSplitList: some View {
        VStack(spacing: 8) {
            ForEach(snapshot.members) { member in
                HStack(spacing: 10) {
                    AvatarView(name: member.name, color: member.color, size: 34)
                    Text(member.name)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(Color.ledgerInk)
                    Spacer()
                    HStack(spacing: 3) {
                        Text(symbol)
                            .font(.system(.caption, design: .monospaced))
                            .foregroundStyle(Color.ledgerSecondary)
                        TextField(
                            "0.00",
                            text: Binding(
                                get: { customAmounts[member.id] ?? "" },
                                set: { customAmounts[member.id] = $0 }
                            )
                        )
                        .font(.system(.subheadline, design: .monospaced))
                        .multilineTextAlignment(.trailing)
                        .keyboardType(.decimalPad)
                        .frame(width: 92)
                        .accessibilityLabel(
                            language.text("\(member.name)的金额", "Amount for \(member.name)")
                        )
                    }
                }
                .padding(.vertical, 7)
            }
        }
    }

    private func save() {
        guard !isSaving else { return }
        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedTitle.isEmpty else {
            errorText = language.text("请填写这笔支出是什么", "What was this expense for?")
            return
        }
        guard amountCents > 0 else {
            errorText = language.text("请输入大于 0 的金额", "Enter an amount greater than 0")
            return
        }
        if splitMode == .equal, participants.isEmpty {
            errorText = language.text("至少选择一位分摊成员", "Select at least one traveler to split with")
            return
        }
        if splitMode == .custom, customTotal != amountCents {
            errorText = language.text("每个人金额之和必须等于支出总额", "The individual amounts must add up to the total")
            return
        }

        let customShares = snapshot.members.compactMap { member -> ExpenseShare? in
            let cents = Money.cents(from: customAmounts[member.id] ?? "")
            return cents > 0 ? ExpenseShare(memberId: member.id, amountCents: cents) : nil
        }
        let payload = CreateExpensePayload(
            title: trimmedTitle,
            amountCents: amountCents,
            category: category,
            paidBy: paidBy,
            date: TripDates.string(from: date),
            notes: notes.trimmingCharacters(in: .whitespacesAndNewlines),
            splitMode: splitMode,
            participants: splitMode == .equal
                ? snapshot.members.map(\.id).filter { participants.contains($0) }
                : customShares.map(\.memberId),
            customShares: splitMode == .custom ? customShares : []
        )

        isSaving = true
        errorText = nil
        amountFocused = false
        Task {
            do {
                try await model.submitExpense(payload)
                UINotificationFeedbackGenerator().notificationOccurred(.success)
                dismiss()
            } catch {
                errorText = TripCopy.localizedError(error, language: language)
            }
            isSaving = false
        }
    }
}
