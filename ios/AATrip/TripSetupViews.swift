import SwiftUI

struct CreateTripSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    let language: AppLanguage

    @State private var name = ""
    @State private var destination = ""
    @State private var currency = "CNY"
    @State private var startDate = Date()
    @State private var endDate = Calendar.current.date(byAdding: .day, value: 3, to: Date()) ?? Date()
    @State private var members: [String]
    @State private var isSaving = false
    @State private var errorText: String?

    init(language: AppLanguage) {
        self.language = language
        _members = State(initialValue: [language.text("我", "Me")])
    }

    private var cleanedMembers: [String] {
        members.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField(language.text("例如：十一云南慢旅行", "e.g. Seven days in Yunnan"), text: $name)
                        .textInputAutocapitalization(.sentences)
                        .submitLabel(.next)
                } header: {
                    Text(language.text("行程名称", "Trip name"))
                }

                Section(language.text("路线", "Route")) {
                    TextField(language.text("大理 · 丽江", "Dali · Lijiang"), text: $destination)
                        .textInputAutocapitalization(.words)

                    Picker(language.text("记账币种", "Currency"), selection: $currency) {
                        ForEach(TripCopy.currencies, id: \.self) { code in
                            Text("\(code) · \(Money.symbol(for: code))").tag(code)
                        }
                    }
                }

                Section(language.text("日期", "Dates")) {
                    DatePicker(
                        language.text("出发日期", "Depart"),
                        selection: $startDate,
                        displayedComponents: .date
                    )
                    DatePicker(
                        language.text("返程日期", "Return"),
                        selection: $endDate,
                        in: startDate...,
                        displayedComponents: .date
                    )
                }

                Section {
                    ForEach(Array(members.enumerated()), id: \.offset) { index, _ in
                        HStack(spacing: 10) {
                            Text(String(format: "%02d", index + 1))
                                .font(.system(.caption, design: .monospaced))
                                .foregroundStyle(Color.ledgerSecondary)
                                .frame(width: 28)

                            TextField(
                                language.text("成员名字", "Traveler name"),
                                text: Binding(
                                    get: { members[index] },
                                    set: { members[index] = $0 }
                                )
                            )
                            .textInputAutocapitalization(.words)

                            if members.count > 1 {
                                Button {
                                    members.remove(at: index)
                                } label: {
                                    Image(systemName: "minus.circle.fill")
                                        .foregroundStyle(Color.ledgerSecondary)
                                }
                                .buttonStyle(.borderless)
                                .accessibilityLabel(language.text("移除成员", "Remove traveler"))
                            }
                        }
                    }

                    Button {
                        withAnimation(.snappy(duration: 0.22)) {
                            members.append("")
                        }
                    } label: {
                        Label(language.text("再加一位", "Add another traveler"), systemImage: "plus")
                    }
                    .disabled(members.count >= 16)
                } header: {
                    Text(language.text("同行成员", "Travelers"))
                } footer: {
                    Text(language.text("之后也可以把六位行程码发给更多同伴。", "You can invite more people with the six-character trip code later."))
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
            .navigationTitle(language.text("新建行程", "New trip"))
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
                        create()
                    } label: {
                        if isSaving {
                            ProgressView()
                        } else {
                            Text(language.text("建立账本", "Create"))
                                .fontWeight(.semibold)
                        }
                    }
                    .disabled(isSaving || name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || cleanedMembers.isEmpty)
                }
            }
            .interactiveDismissDisabled(isSaving)
        }
    }

    private func create() {
        guard !isSaving else { return }
        guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorText = language.text("先给这次旅行起个名字", "Give this trip a name first")
            return
        }
        guard !cleanedMembers.isEmpty else {
            errorText = language.text("至少留下一位同行成员", "Keep at least one traveler")
            return
        }

        isSaving = true
        errorText = nil
        Task {
            do {
                try await model.createTrip(
                    name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                    destination: destination.trimmingCharacters(in: .whitespacesAndNewlines),
                    startDate: TripDates.string(from: startDate),
                    endDate: TripDates.string(from: endDate),
                    currency: currency,
                    members: cleanedMembers
                )
                dismiss()
            } catch {
                errorText = TripCopy.localizedError(error, language: language)
            }
            isSaving = false
        }
    }
}

struct JoinTripSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @FocusState private var codeFocused: Bool

    @State private var code = ""
    @State private var isJoining = false
    @State private var errorText: String?

    private var language: AppLanguage { model.language }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 22) {
                    ticket

                    VStack(alignment: .leading, spacing: 10) {
                        Text(language.text("六位行程码", "Six-character trip code"))
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Color.ledgerSecondary)

                        TextField("A7K9Q2", text: $code)
                            .font(.system(.title, design: .monospaced).weight(.medium))
                            .tracking(6)
                            .multilineTextAlignment(.center)
                            .textInputAutocapitalization(.characters)
                            .autocorrectionDisabled()
                            .textContentType(.oneTimeCode)
                            .focused($codeFocused)
                            .submitLabel(.go)
                            .onSubmit(join)
                            .onChange(of: code) { _, next in
                                let filtered = next
                                    .uppercased()
                                    .filter { $0.isLetter || $0.isNumber }
                                code = String(filtered.prefix(6))
                            }
                            .frame(minHeight: 68)
                            .background(Color.ledgerSurface)
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                            .overlay {
                                RoundedRectangle(cornerRadius: 14, style: .continuous)
                                    .stroke(code.count == 6 ? Color.ledgerTeal : Color.ledgerLine, lineWidth: 1)
                            }
                    }

                    if let errorText {
                        Text(errorText)
                            .font(.subheadline)
                            .foregroundStyle(Color.ledgerRed)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    Button(action: join) {
                        Group {
                            if isJoining {
                                ProgressView().tint(.white)
                            } else {
                                Label(language.text("打开这个账本", "Open this ledger"), systemImage: "arrow.right")
                            }
                        }
                    }
                    .buttonStyle(PrimaryActionStyle())
                    .disabled(code.count != 6 || isJoining)
                }
                .padding(22)
            }
            .background(LedgerBackground())
            .navigationTitle(language.text("加入行程", "Join a trip"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(language.text("取消", "Cancel")) {
                        dismiss()
                    }
                    .disabled(isJoining)
                }
            }
            .task {
                try? await Task.sleep(for: .milliseconds(250))
                codeFocused = true
            }
            .interactiveDismissDisabled(isJoining)
        }
    }

    private var ticket: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(Color.ledgerGoldSoft)
                .overlay {
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .strokeBorder(
                            Color.ledgerInk.opacity(0.28),
                            style: StrokeStyle(lineWidth: 1, dash: [5, 5])
                        )
                }

            VStack(spacing: 5) {
                Text("INVITE")
                    .font(.system(.caption2, design: .monospaced).weight(.medium))
                    .tracking(1.8)
                    .foregroundStyle(Color.ledgerSecondary)
                Text("6")
                    .font(.system(size: 54, weight: .black, design: .serif))
                    .foregroundStyle(Color.ledgerInk)
                Text(language.text("位行程码", "characters"))
                    .font(.caption)
                    .foregroundStyle(Color.ledgerSecondary)
            }
        }
        .frame(height: 155)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(language.text("六位行程码", "Six-character trip code"))
    }

    private func join() {
        guard code.count == 6, !isJoining else { return }
        isJoining = true
        errorText = nil
        codeFocused = false
        Task {
            do {
                try await model.joinTrip(code: code)
                dismiss()
            } catch {
                errorText = TripCopy.localizedError(error, language: language)
            }
            isJoining = false
        }
    }
}
