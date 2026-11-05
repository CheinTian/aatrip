import SwiftUI

struct AccountMenuButton: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    @Binding var showsAuth: Bool
    @Binding var showsMyTrips: Bool
    var compact = false

    private var language: AppLanguage { model.language }
    private var usesCompactLabel: Bool {
        compact || dynamicTypeSize.isAccessibilitySize
    }

    var body: some View {
        Menu {
            if let user = model.authUser {
                Section(user.name) {
                    if !user.email.isEmpty {
                        Text(user.email)
                    }
                    if !user.providers.isEmpty {
                        Text(
                            user.providers
                                .map(\.displayName)
                                .joined(separator: " · ")
                        )
                    }
                }

                Button {
                    showsMyTrips = true
                } label: {
                    Label(language.text("我的行程", "My trips"), systemImage: "suitcase.rolling.fill")
                }

                Divider()

                Button(role: .destructive) {
                    Task { await model.signOut() }
                } label: {
                    Label(language.text("退出登录", "Sign out"), systemImage: "rectangle.portrait.and.arrow.right")
                }
            } else {
                Section(language.text("AA簿账号", "AA Ledger account")) {
                    Text(language.text("登录后跨设备查看你创建和加入的行程。", "Sign in to see your created and joined trips across devices."))
                }

                Button {
                    showsAuth = true
                } label: {
                    Label(language.text("登录", "Sign in"), systemImage: "person.crop.circle.badge.plus")
                }
            }
        } label: {
            if let user = model.authUser {
                AccountAvatar(user: user, size: usesCompactLabel ? 32 : 34)
                    .frame(width: 44, height: 44)
                    .contentShape(Rectangle())
            } else {
                HStack(spacing: 6) {
                    Image(systemName: "person.crop.circle")
                    if !usesCompactLabel {
                        Text(language.text("登录", "Sign in"))
                            .font(.subheadline.weight(.semibold))
                    }
                }
                .foregroundStyle(Color.ledgerInk)
                .frame(minWidth: usesCompactLabel ? 44 : 54, minHeight: 44)
                .padding(.horizontal, usesCompactLabel ? 2 : 8)
                .background(Color.ledgerSurface.opacity(0.78))
                .clipShape(Capsule())
                .overlay {
                    Capsule().stroke(Color.ledgerLine, lineWidth: 1)
                }
            }
        }
        .accessibilityLabel(
            model.authUser == nil
                ? language.text("登录", "Sign in")
                : language.text("账号菜单", "Account menu")
        )
    }
}

struct AccountAvatar: View {
    let user: AuthUser
    var size: CGFloat = 34

    var body: some View {
        Group {
            if let url = URL(string: user.avatarUrl), !user.avatarUrl.isEmpty {
                AsyncImage(url: url) { phase in
                    if let image = phase.image {
                        image
                            .resizable()
                            .scaledToFill()
                    } else {
                        fallback
                    }
                }
            } else {
                fallback
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay {
            Circle().stroke(Color.ledgerGold.opacity(0.7), lineWidth: 1.5)
        }
        .accessibilityHidden(true)
    }

    private var fallback: some View {
        Text(initials)
            .font(.system(size: size * 0.34, weight: .bold, design: .monospaced))
            .foregroundStyle(.white)
            .frame(width: size, height: size)
            .background(Color.ledgerForest)
    }

    private var initials: String {
        let source = user.name.trimmingCharacters(in: .whitespacesAndNewlines)
        if !source.isEmpty {
            return String(source.prefix(2)).uppercased()
        }
        return String(user.email.prefix(2)).uppercased()
    }
}

struct AuthSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @ScaledMetric(relativeTo: .largeTitle) private var markSize: CGFloat = 72

    let language: AppLanguage

    @State private var errorText: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    hero

                    VStack(spacing: 12) {
                        ForEach(AuthProvider.allCases) { provider in
                            providerButton(provider)
                        }
                    }
                    .padding(.top, 30)

                    if let errorText {
                        Label(errorText, systemImage: "exclamationmark.triangle.fill")
                            .font(.footnote.weight(.medium))
                            .foregroundStyle(Color.ledgerRed)
                            .padding(.top, 16)
                            .accessibilityElement(children: .combine)
                    }

                    anonymousNote
                        .padding(.top, 24)

                    privacyNote
                        .padding(.top, 14)
                        .padding(.bottom, 24)
                }
                .padding(.horizontal, 24)
                .frame(maxWidth: 560)
                .frame(maxWidth: .infinity)
            }
            .background(LedgerBackground())
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(Color.ledgerSecondary)
                            .frame(width: 32, height: 32)
                            .background(Color.ledgerSurface)
                            .clipShape(Circle())
                            .overlay {
                                Circle().stroke(Color.ledgerLine, lineWidth: 1)
                            }
                            .frame(width: 44, height: 44)
                            .contentShape(Rectangle())
                    }
                    .accessibilityLabel(language.text("关闭", "Close"))
                }
            }
            .interactiveDismissDisabled(model.isAuthenticating)
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(alignment: .top) {
                BrandMark(size: markSize)
                Spacer()
                Text("TRAVEL LEDGER")
                    .font(.system(size: 9, weight: .medium, design: .monospaced))
                    .tracking(1.8)
                    .foregroundStyle(Color.ledgerSecondary)
                    .padding(.top, 7)
            }

            VStack(alignment: .leading, spacing: 8) {
                Text(language.text("把同行的人，\n也带进这本账。", "Bring your travel\nparty into the ledger."))
                    .font(.system(.largeTitle, design: .serif).weight(.black))
                    .tracking(-0.8)
                    .foregroundStyle(Color.ledgerInk)
                    .fixedSize(horizontal: false, vertical: true)

                Text(language.text(
                    "登录后，你创建或加入的行程会出现在「我的行程」中，换一台设备也能继续记账。",
                    "After signing in, trips you create or join appear in My Trips, ready on your other devices."
                ))
                .font(.subheadline)
                .foregroundStyle(Color.ledgerSecondary)
                .lineSpacing(4)
            }
        }
        .padding(.top, 16)
    }

    private func providerButton(_ provider: AuthProvider) -> some View {
        let enabled = model.authProviders.isEnabled(provider)
        let busy = model.authenticatingProvider == provider

        return Button {
            startSignIn(provider)
        } label: {
            HStack(spacing: 14) {
                ProviderGlyph(provider: provider)

                VStack(alignment: .leading, spacing: 2) {
                    Text(
                        language.text(
                            "使用 \(provider.displayName) 登录",
                            "Continue with \(provider.displayName)"
                        )
                    )
                    .font(.headline)
                    .foregroundStyle(Color.ledgerInk)

                    Text(
                        enabled
                            ? language.text("安全跳转至 \(provider.displayName) 授权", "Opens \(provider.displayName) securely")
                            : language.text("暂未开通", "Not available yet")
                    )
                    .font(.caption)
                    .foregroundStyle(Color.ledgerSecondary)
                }

                Spacer(minLength: 8)

                if busy {
                    ProgressView()
                        .tint(Color.ledgerOrange)
                } else {
                    Image(systemName: "arrow.up.right")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(Color.ledgerSecondary)
                }
            }
            .padding(.horizontal, 16)
            .frame(maxWidth: .infinity, minHeight: 68)
            .background(Color.ledgerSurface)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(alignment: .leading) {
                RoundedRectangle(cornerRadius: 2)
                    .fill(provider == .google ? Color.ledgerGold : Color.ledgerForest)
                    .frame(width: 3)
                    .padding(.vertical, 10)
                    .padding(.leading, 1)
            }
            .overlay {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(Color.ledgerLine, lineWidth: 1)
            }
            .opacity(enabled ? 1 : 0.55)
        }
        .buttonStyle(PressableButtonStyle())
        .disabled(!enabled || model.isAuthenticating)
    }

    private var anonymousNote: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "ticket")
                .foregroundStyle(Color.ledgerOrange)
                .frame(width: 22)
            Text(language.text(
                "不登录也可以继续用行程码记账。登录只用来关联账号和跨设备找回行程。",
                "You can keep using trip codes without signing in. An account simply keeps your trips linked across devices."
            ))
            .font(.caption)
            .foregroundStyle(Color.ledgerSecondary)
            .lineSpacing(3)
        }
        .padding(14)
        .background(Color.ledgerGoldSoft.opacity(0.62))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var privacyNote: some View {
        Label(
            language.text(
                "AA簿只读取你的公开头像、昵称和已验证邮箱，不会发布任何内容。",
                "AA Ledger only reads your public avatar, name, and verified email. It never posts for you."
            ),
            systemImage: "lock.shield"
        )
        .font(.caption2)
        .foregroundStyle(Color.ledgerSecondary)
        .lineSpacing(3)
    }

    private func startSignIn(_ provider: AuthProvider) {
        guard !model.isAuthenticating else { return }
        errorText = nil
        Task {
            do {
                try await model.signIn(provider)
                dismiss()
            } catch let error as AuthClientError where error.code == "auth_cancelled" {
                // Closing the system browser is an intentional no-op.
            } catch {
                errorText = TripCopy.localizedError(error, language: language)
            }
        }
    }
}

private struct ProviderGlyph: View {
    let provider: AuthProvider

    var body: some View {
        Group {
            switch provider {
            case .google:
                Text("G")
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundStyle(Color.ledgerOrange)
            case .github:
                Image(systemName: "chevron.left.forwardslash.chevron.right")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(Color.ledgerForest)
            }
        }
        .frame(width: 42, height: 42)
        .background(
            provider == .google
                ? Color.ledgerGoldSoft
                : Color.ledgerTealSoft
        )
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .accessibilityHidden(true)
    }
}

struct MyTripsView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    let language: AppLanguage

    private enum TripAlert {
        case leave(UserTrip)
        case error(String)
    }

    @State private var activeAlert: TripAlert?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    intro

                    content
                }
                .padding(.horizontal, 18)
                .padding(.top, 8)
                .padding(.bottom, 30)
                .frame(maxWidth: 760)
                .frame(maxWidth: .infinity)
            }
            .background(LedgerBackground())
            .navigationTitle(language.text("我的行程", "My trips"))
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(language.text("完成", "Done")) {
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
            .refreshable {
                await model.loadMyTrips()
            }
            .task {
                if model.authUser != nil {
                    await model.loadMyTrips()
                }
            }
            .alert(
                alertTitle,
                isPresented: Binding(
                    get: { activeAlert != nil },
                    set: { if !$0 { activeAlert = nil } }
                )
            ) {
                if let activeAlert {
                    switch activeAlert {
                    case .leave(let trip):
                        Button(language.text("取消", "Cancel"), role: .cancel) {
                            self.activeAlert = nil
                        }
                        Button(language.text("离开", "Leave"), role: .destructive) {
                            leave(trip)
                        }
                    case .error:
                        Button(language.text("好", "OK"), role: .cancel) {
                            self.activeAlert = nil
                        }
                    }
                }
            } message: {
                if let activeAlert {
                    switch activeAlert {
                    case .leave(let trip):
                        Text(language.text(
                            "离开「\(trip.name)」后，它不会再出现在你的账号里。账本本身和同行成员不会受到影响。",
                            "“\(trip.name)” will disappear from your account. The ledger and its travelers are not deleted."
                        ))
                    case .error(let message):
                        Text(message)
                    }
                }
            }
        }
    }

    private var alertTitle: String {
        switch activeAlert {
        case .leave:
            language.text("离开这个行程？", "Leave this trip?")
        case .error:
            language.text("没有完成", "Something went wrong")
        case .none:
            ""
        }
    }

    private var intro: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(language.text("登录账号关联的账本", "Ledgers linked to your account"))
                .font(.system(.title3, design: .serif).weight(.bold))
                .foregroundStyle(Color.ledgerInk)
            Text(language.text(
                "打开行程继续记账，或从账号中移除不再参与的行程。",
                "Open a trip to keep recording, or remove one you no longer take part in."
            ))
            .font(.subheadline)
            .foregroundStyle(Color.ledgerSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private var content: some View {
        if model.authUser == nil {
            signedOutState
        } else if model.isLoadingTrips && model.myTrips.isEmpty {
            loadingState
        } else if let myTripsError = model.myTripsError, model.myTrips.isEmpty {
            errorState(myTripsError)
        } else if model.myTrips.isEmpty {
            emptyState
        } else {
            LazyVStack(spacing: 12) {
                ForEach(model.myTrips) { trip in
                    tripCard(trip)
                }
            }
        }
    }

    private func tripCard(_ trip: UserTrip) -> some View {
        ZStack(alignment: .topTrailing) {
            Button {
                open(trip)
            } label: {
                VStack(alignment: .leading, spacing: 14) {
                    HStack(alignment: .top, spacing: 10) {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(trip.name)
                                .font(.system(.title3, design: .serif).weight(.bold))
                                .foregroundStyle(Color.ledgerInk)
                                .lineLimit(2)

                            Text(routeText(trip))
                                .font(.caption)
                                .foregroundStyle(Color.ledgerSecondary)
                        }

                        Spacer(minLength: 6)

                        Text(
                            trip.role == "owner"
                                ? language.text("发起人", "Owner")
                                : language.text("成员", "Member")
                        )
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                        .foregroundStyle(
                            trip.role == "owner"
                                ? Color.ledgerOrange
                                : Color.ledgerTeal
                        )
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(
                            trip.role == "owner"
                                ? Color.ledgerOrange.opacity(0.1)
                                : Color.ledgerTealSoft
                        )
                        .clipShape(Capsule())
                    }
                    .padding(.trailing, 42)

                    Rectangle()
                        .fill(Color.ledgerLine)
                        .frame(height: 1)

                    tripMetrics(trip)

                    HStack(spacing: 7) {
                        Image(systemName: "number")
                        Text(trip.inviteCode)
                            .font(.system(.caption, design: .monospaced).weight(.semibold))
                        Spacer()
                        Text(language.text("继续记账", "Open ledger"))
                            .font(.caption.weight(.semibold))
                        Image(systemName: "chevron.right")
                            .font(.caption2.weight(.bold))
                    }
                    .foregroundStyle(Color.ledgerSecondary)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(PressableButtonStyle())

            Menu {
                Button {
                    open(trip)
                } label: {
                    Label(language.text("打开行程", "Open trip"), systemImage: "arrow.up.right")
                }
                Button(role: .destructive) {
                    activeAlert = .leave(trip)
                } label: {
                    Label(language.text("离开行程", "Leave trip"), systemImage: "rectangle.portrait.and.arrow.right")
                }
            } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(Color.ledgerSecondary)
                    .frame(width: 34, height: 34)
                    .background(Color.ledgerPaper)
                    .clipShape(Circle())
                    .frame(width: 44, height: 44)
                    .contentShape(Rectangle())
            }
            .accessibilityLabel(language.text("行程操作", "Trip actions"))
        }
        .paperCard(padding: 16)
    }

    private func metric(value: String, label: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(.system(.subheadline, design: .monospaced).weight(.semibold))
                .foregroundStyle(Color.ledgerInk)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(label)
                .font(.caption2)
                .foregroundStyle(Color.ledgerSecondary)
        }
    }

    @ViewBuilder
    private func tripMetrics(_ trip: UserTrip) -> some View {
        let amount = metric(
            value: Money.string(
                cents: trip.totalCents,
                currency: trip.currency,
                language: language
            ),
            label: language.text("共同支出", "Shared")
        )
        let members = metric(
            value: "\(trip.memberCount)",
            label: language.text("成员", "People")
        )
        let expenses = metric(
            value: "\(trip.expenseCount)",
            label: language.text("笔支出", "Expenses")
        )

        if dynamicTypeSize.isAccessibilitySize {
            VStack(alignment: .leading, spacing: 8) {
                amount
                HStack(spacing: 18) {
                    members
                    expenses
                }
            }
        } else {
            HStack(spacing: 18) {
                amount
                Spacer(minLength: 4)
                members
                expenses
            }
        }
    }

    private func routeText(_ trip: UserTrip) -> String {
        let destination = trip.destination.isEmpty
            ? language.text("目的地待定", "Destination pending")
            : trip.destination
        guard !trip.startDate.isEmpty, !trip.endDate.isEmpty else {
            return destination
        }
        return "\(destination) · \(TripDates.display(trip.startDate, language: language)) – \(TripDates.display(trip.endDate, language: language))"
    }

    private var loadingState: some View {
        VStack(spacing: 12) {
            ProgressView()
                .controlSize(.large)
                .tint(Color.ledgerOrange)
            Text(language.text("正在整理你的行程…", "Gathering your trips…"))
                .font(.subheadline)
                .foregroundStyle(Color.ledgerSecondary)
        }
        .frame(maxWidth: .infinity, minHeight: 280)
    }

    private var emptyState: some View {
        VStack(spacing: 14) {
            Image(systemName: "suitcase.rolling")
                .font(.system(size: 30, weight: .medium))
                .foregroundStyle(Color.ledgerOrange)
                .frame(width: 70, height: 70)
                .background(Color.ledgerGoldSoft)
                .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))

            Text(language.text("还没有关联行程", "No linked trips yet"))
                .font(.system(.title3, design: .serif).weight(.bold))
                .foregroundStyle(Color.ledgerInk)

            Text(language.text(
                "回首页创建一个行程，或输入朋友分享的行程码。登录后，这些行程会自动收进这里。",
                "Create a trip on the home screen or enter a friend’s trip code. Once linked, it will appear here."
            ))
            .font(.subheadline)
            .foregroundStyle(Color.ledgerSecondary)
            .multilineTextAlignment(.center)
            .frame(maxWidth: 340)

            Button(language.text("返回首页", "Back home")) {
                dismiss()
            }
            .buttonStyle(SecondaryActionStyle())
            .frame(maxWidth: 220)
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity, minHeight: 320)
        .padding(20)
    }

    private func errorState(_ message: String) -> some View {
        VStack(spacing: 14) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 28, weight: .medium))
                .foregroundStyle(Color.ledgerOrange)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(Color.ledgerSecondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 320)
            Button(language.text("重试", "Try again")) {
                Task { await model.loadMyTrips() }
            }
            .buttonStyle(SecondaryActionStyle())
            .frame(maxWidth: 200)
        }
        .frame(maxWidth: .infinity, minHeight: 300)
    }

    private var signedOutState: some View {
        VStack(spacing: 14) {
            BrandMark(size: 62)
            Text(language.text("登录已失效", "Your session ended"))
                .font(.system(.title3, design: .serif).weight(.bold))
                .foregroundStyle(Color.ledgerInk)
            Text(language.text(
                "请关闭此页，从首页重新登录。",
                "Close this page and sign in again from the home screen."
            ))
            .font(.subheadline)
            .foregroundStyle(Color.ledgerSecondary)
            Button(language.text("返回首页", "Back home")) {
                dismiss()
            }
            .buttonStyle(SecondaryActionStyle())
            .frame(maxWidth: 220)
        }
        .frame(maxWidth: .infinity, minHeight: 320)
    }

    private func open(_ trip: UserTrip) {
        Task {
            await model.openTrip(trip.id)
            dismiss()
        }
    }

    private func leave(_ trip: UserTrip) {
        activeAlert = nil
        Task {
            do {
                try await model.leaveMyTrip(trip)
            } catch {
                activeAlert = .error(
                    TripCopy.localizedError(error, language: language)
                )
            }
        }
    }
}
