import SwiftUI

struct MembersView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    let snapshot: TripSnapshot

    @State private var memberName = ""
    @State private var isAdding = false
    @State private var memberToRemove: Member?
    @State private var errorText: String?

    private var language: AppLanguage { model.language }
    private var trip: Trip { snapshot.trip }
    private var usesAccessibilityLayout: Bool { dynamicTypeSize.isAccessibilitySize }

    private var balanceById: [String: MemberBalance] {
        Dictionary(uniqueKeysWithValues: snapshot.balances.map { ($0.memberId, $0) })
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                inviteCard
                memberCard
                addMemberCard
            }
            .padding(.horizontal, 18)
            .padding(.top, 8)
            .padding(.bottom, 30)
            .frame(maxWidth: 840)
            .frame(maxWidth: .infinity)
        }
        .background(LedgerBackground())
        .navigationTitle(language.text("成员与邀请", "Travelers"))
        .navigationBarTitleDisplayMode(.large)
        .refreshable {
            await model.refresh()
        }
        .confirmationDialog(
            language.text("移除这位成员？", "Remove this traveler?"),
            isPresented: Binding(
                get: { memberToRemove != nil },
                set: { if !$0 { memberToRemove = nil } }
            ),
            titleVisibility: .visible,
            presenting: memberToRemove
        ) { member in
            Button(language.text("移除", "Remove"), role: .destructive) {
                remove(member)
            }
            Button(language.text("取消", "Cancel"), role: .cancel) {
                memberToRemove = nil
            }
        } message: { member in
            Text(language.text("\(member.name) 将从同行名单中移除。", "\(member.name) will be removed from this trip."))
        }
        .alert(
            language.text("操作没有完成", "Something went wrong"),
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

    private var inviteCard: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(language.text("邀请同伴", "Invite travelers"))
                        .font(.system(.title3, design: .serif).weight(.bold))
                        .foregroundStyle(.white)
                    Text(language.text("把行程码发给同行的人，输入后进入同一个账本。", "Send this code to your group. Everyone enters the same ledger."))
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.76))
                        .lineSpacing(3)
                }
                Spacer()
                Image(systemName: "person.badge.plus")
                    .font(.system(size: 24, weight: .medium))
                    .foregroundStyle(.white.opacity(0.84))
            }

            inviteCodeRow
        }
        .padding(20)
        .background(Color.ledgerOrange)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(alignment: .topTrailing) {
            Circle()
                .stroke(.white.opacity(0.08), lineWidth: 22)
                .frame(width: 160, height: 160)
                .offset(x: 60, y: -54)
        }
    }

    @ViewBuilder
    private var inviteCodeRow: some View {
        if usesAccessibilityLayout {
            VStack(alignment: .leading, spacing: 12) {
                inviteCode

                HStack(spacing: 10) {
                    copyInviteButton
                    shareInviteButton
                    Spacer(minLength: 0)
                }
            }
        } else {
            HStack(spacing: 10) {
                inviteCode
                Spacer(minLength: 10)
                copyInviteButton
                shareInviteButton
            }
        }
    }

    private var inviteCode: some View {
        Text(trip.inviteCode)
            .font(.system(.title, design: .monospaced).weight(.medium))
            .tracking(3)
            .foregroundStyle(.white)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
    }

    private var copyInviteButton: some View {
        Button {
            UIPasteboard.general.string = trip.inviteCode
            model.showToast(language.text("行程码已复制", "Trip code copied"))
        } label: {
            Label(language.text("复制", "Copy"), systemImage: "doc.on.doc")
                .font(.caption.weight(.semibold))
                .foregroundStyle(Color.ledgerOrange)
                .padding(.horizontal, 12)
                .frame(minHeight: 44)
                .background(.white)
                .clipShape(Capsule())
        }
        .buttonStyle(PressableButtonStyle())
    }

    private var shareInviteButton: some View {
        ShareLink(
            item: TripSharing.tripURL(trip),
            subject: Text(language.text("AA簿邀请", "AA Ledger invite")),
            message: Text(TripSharing.inviteMessage(trip, language: language))
        ) {
            Image(systemName: "square.and.arrow.up")
                .font(.body.weight(.semibold))
                .foregroundStyle(.white)
                .frame(width: 44, height: 44)
                .background(.white.opacity(0.16))
                .clipShape(Circle())
        }
        .accessibilityLabel(language.text("分享邀请", "Share invite"))
    }

    private var memberCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionTitle(
                title: language.count(snapshot.members.count, "位同行成员", "traveler", "travelers")
            )

            VStack(spacing: 0) {
                ForEach(Array(snapshot.members.enumerated()), id: \.element.id) { index, member in
                    memberRow(member)
                    if index < snapshot.members.count - 1 {
                        Divider()
                            .overlay(Color.ledgerLine)
                            .padding(.leading, 52)
                    }
                }
            }
        }
        .paperCard()
    }

    private func memberRow(_ member: Member) -> some View {
        let balance = balanceById[member.id]
        let canDelete = (balance?.paidCents ?? 0) == 0 && (balance?.owedCents ?? 0) == 0

        return Group {
            if usesAccessibilityLayout {
                VStack(alignment: .leading, spacing: 10) {
                    HStack(alignment: .top, spacing: 12) {
                        AvatarView(name: member.name, color: member.color, size: 42)
                        memberIdentity(member, balance: balance)
                        Spacer(minLength: 8)

                        if canDelete {
                            memberMenu(member)
                        }
                    }

                    HStack(alignment: .firstTextBaseline, spacing: 12) {
                        Text(language.text("净额", "Net"))
                            .font(.caption)
                            .foregroundStyle(Color.ledgerSecondary)
                        Spacer(minLength: 12)
                        memberNetValue(balance)
                    }
                }
            } else {
                HStack(spacing: 12) {
                    AvatarView(name: member.name, color: member.color, size: 42)
                    memberIdentity(member, balance: balance)
                    Spacer(minLength: 12)

                    VStack(alignment: .trailing, spacing: 3) {
                        Text(language.text("净额", "Net"))
                            .font(.caption2)
                            .foregroundStyle(Color.ledgerSecondary)
                        memberNetValue(balance)
                    }

                    if canDelete {
                        memberMenu(member)
                    }
                }
            }
        }
        .padding(.vertical, 11)
    }

    private func memberIdentity(_ member: Member, balance: MemberBalance?) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(member.name)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Color.ledgerInk)
            Text(
                language.text(
                    "垫付 \(Money.string(cents: balance?.paidCents ?? 0, currency: trip.currency, language: language))",
                    "Paid \(Money.string(cents: balance?.paidCents ?? 0, currency: trip.currency, language: language))"
                )
            )
            .font(.caption)
            .foregroundStyle(Color.ledgerSecondary)
            .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func memberNetValue(_ balance: MemberBalance?) -> some View {
        Text(
            Money.string(
                cents: balance?.netCents ?? 0,
                currency: trip.currency,
                language: language,
                signed: true
            )
        )
        .font(.system(.caption, design: .monospaced).weight(.semibold))
        .foregroundStyle((balance?.netCents ?? 0) >= 0 ? Color.ledgerTeal : Color.ledgerRed)
        .fixedSize(horizontal: false, vertical: true)
    }

    private func memberMenu(_ member: Member) -> some View {
        Menu {
            Button(role: .destructive) {
                memberToRemove = member
            } label: {
                Label(language.text("移除成员", "Remove traveler"), systemImage: "person.badge.minus")
            }
        } label: {
            Image(systemName: "ellipsis")
                .foregroundStyle(Color.ledgerSecondary)
                .frame(width: 44, height: 44)
        }
        .accessibilityLabel(language.text("成员菜单", "Traveler menu"))
    }

    private var addMemberCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionTitle(title: language.text("还有谁一起？", "Who else is coming?"))

            HStack(spacing: 10) {
                TextField(language.text("成员名字", "Traveler name"), text: $memberName)
                    .textInputAutocapitalization(.words)
                    .submitLabel(.done)
                    .onSubmit(addMember)
                    .frame(minHeight: 46)
                    .padding(.horizontal, 12)
                    .background(Color.ledgerPaper)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .overlay {
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .stroke(Color.ledgerLine, lineWidth: 1)
                    }

                Button(action: addMember) {
                    if isAdding {
                        ProgressView()
                            .tint(.white)
                            .frame(width: 44, height: 44)
                    } else {
                        Image(systemName: "plus")
                            .font(.body.weight(.semibold))
                            .foregroundStyle(.white)
                            .frame(width: 44, height: 44)
                    }
                }
                .background(Color.ledgerForest)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .buttonStyle(PressableButtonStyle())
                .disabled(
                    isAdding
                        || memberName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                        || snapshot.members.count >= 16
                )
                .opacity(
                    memberName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                        ? 0.45
                        : 1
                )
                .accessibilityLabel(language.text("添加成员", "Add traveler"))
            }

            Text(language.text("已经参与支出的成员不能直接移除，避免账目丢失。", "Travelers who already appear in an expense cannot be removed, so the ledger stays intact."))
                .font(.caption)
                .foregroundStyle(Color.ledgerSecondary)
                .lineSpacing(3)
        }
        .paperCard()
    }

    private func addMember() {
        let name = memberName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty, !isAdding else { return }
        isAdding = true
        errorText = nil
        Task {
            do {
                try await model.addMember(name: name)
                memberName = ""
            } catch {
                errorText = TripCopy.localizedError(error, language: language)
            }
            isAdding = false
        }
    }

    private func remove(_ member: Member) {
        memberToRemove = nil
        Task {
            do {
                try await model.removeMember(member)
            } catch {
                errorText = TripCopy.localizedError(error, language: language)
            }
        }
    }
}
