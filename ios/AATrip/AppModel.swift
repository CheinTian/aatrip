import Foundation
import Observation

@MainActor
@Observable
final class AppModel {
    private enum DefaultsKey {
        static let lastTrip = "aatrip.ios.lastTrip"
        static let language = "aatrip.ios.language"
        static let visitor = "aatrip.ios.visitor"
    }

    private let api: AATripAPI
    private let defaults: UserDefaults
    private let webAuth = WebAuthSession()
    private var hasStoredAuth = false
    private var pendingAuthVerifier: String?
    private var handledAuthCodes: Set<String> = []

    var language: AppLanguage
    var activeTripId: String?
    var lastTripId: String?
    var snapshot: TripSnapshot?
    var isLaunching = true
    var isLoading = false
    var isRefreshing = false
    var isWorking = false
    var errorMessage: String?
    var toast: String?
    var visitStats: VisitStats?
    var authUser: AuthUser?
    var authProviders: AuthProviders = .none
    var myTrips: [UserTrip] = []
    var isLoadingTrips = false
    var myTripsError: String?
    var authenticatingProvider: AuthProvider?

    var isAuthenticating: Bool {
        authenticatingProvider != nil
    }

    init(api: AATripAPI = AATripAPI(), defaults: UserDefaults = .standard) {
        self.api = api
        self.defaults = defaults

        if let override = ProcessInfo.processInfo.environment["AATRIP_LANGUAGE"],
           let language = AppLanguage(rawValue: override) {
            self.language = language
        } else if let stored = defaults.string(forKey: DefaultsKey.language),
                  let language = AppLanguage(rawValue: stored) {
            self.language = language
        } else {
            self.language = Locale.current.language.languageCode?.identifier == "zh"
                ? .zhHans
                : .en
        }

        self.lastTripId = defaults.string(forKey: DefaultsKey.lastTrip)

        #if DEBUG
        if let debugToken = ProcessInfo.processInfo.environment["AATRIP_AUTH_TOKEN"],
           !debugToken.isEmpty {
            api.setAuthorizationToken(debugToken)
            hasStoredAuth = true
        }
        #endif

        if !hasStoredAuth, let stored = KeychainSessionStore.load() {
            if stored.isExpired {
                KeychainSessionStore.clear()
            } else {
                api.setAuthorizationToken(stored.token)
                hasStoredAuth = true
            }
        }
    }

    func launch() async {
        guard isLaunching else { return }
        defer { isLaunching = false }

        async let visitor: Void = loadVisitStats()
        await restoreSession()

        #if DEBUG
        if ProcessInfo.processInfo.environment["AATRIP_DEMO_ON_LAUNCH"] == "1" {
            do {
                try await startDemo()
                _ = await visitor
                return
            } catch {
                errorMessage = TripCopy.localizedError(error, language: language)
            }
        }
        #endif

        let forceWelcome = ProcessInfo.processInfo.environment["AATRIP_FORCE_WELCOME"] == "1"
        if let tripId = lastTripId, !forceWelcome {
            await openTrip(tripId)
        }
        _ = await visitor
    }

    func signIn(_ provider: AuthProvider) async throws {
        guard authProviders.isEnabled(provider) else {
            throw AuthClientError(
                code: "auth_not_configured",
                message: "This sign-in option is not available"
            )
        }
        guard authenticatingProvider == nil else { return }

        let pkce = try PKCEPair()
        let startURL = try api.authStartURL(
            provider: provider,
            challenge: pkce.challenge
        )
        authenticatingProvider = provider
        pendingAuthVerifier = pkce.verifier
        defer {
            authenticatingProvider = nil
            if pendingAuthVerifier == pkce.verifier {
                pendingAuthVerifier = nil
            }
        }

        let callbackURL = try await webAuth.authenticate(
            url: startURL,
            callbackScheme: "aatrip"
        )
        try await completeAuthCallback(callbackURL, verifier: pkce.verifier)
    }

    func signOut() async {
        if hasStoredAuth {
            try? await api.logout()
        }
        clearLocalAuth()
        showToast(language.text("已退出登录", "Signed out"))
    }

    func loadMyTrips() async {
        guard authUser != nil, !isLoadingTrips else { return }
        isLoadingTrips = true
        myTripsError = nil
        defer { isLoadingTrips = false }

        do {
            myTrips = try await api.myTrips()
        } catch {
            if let apiError = error as? AATripAPIError, apiError.status == 401 {
                clearLocalAuth()
                showToast(language.text("登录已过期，请重新登录", "Your session expired. Sign in again."))
            } else {
                myTripsError = TripCopy.localizedError(error, language: language)
            }
        }
    }

    func leaveMyTrip(_ trip: UserTrip) async throws {
        try await api.leaveMyTrip(id: trip.id)
        myTrips.removeAll { $0.id == trip.id }
        if activeTripId == trip.id {
            leaveTrip()
        }
        showToast(language.text("已离开行程", "Left the trip"))
    }

    func setLanguage(_ next: AppLanguage) {
        guard language != next else { return }
        language = next
        defaults.set(next.rawValue, forKey: DefaultsKey.language)
    }

    func createTrip(
        name: String,
        destination: String,
        startDate: String,
        endDate: String,
        currency: String,
        members: [String]
    ) async throws {
        isWorking = true
        defer { isWorking = false }

        let created = try await api.createTrip(
            CreateTripPayload(
                name: name,
                destination: destination,
                startDate: startDate,
                endDate: endDate,
                currency: currency,
                members: members
            )
        )
        await openTrip(created.id)
    }

    func joinTrip(code: String) async throws {
        isWorking = true
        defer { isWorking = false }

        let trip = try await api.joinTrip(code: code)
        await openTrip(trip.id)
    }

    func startDemo() async throws {
        isWorking = true
        defer { isWorking = false }

        let created = try await api.createDemo(language: language)
        await openTrip(created.id)
    }

    func openTrip(_ id: String) async {
        activeTripId = id
        snapshot = nil
        errorMessage = nil
        isLoading = true
        defer { isLoading = false }

        do {
            snapshot = try await api.trip(id: id)
            lastTripId = id
            defaults.set(id, forKey: DefaultsKey.lastTrip)
        } catch {
            errorMessage = TripCopy.localizedError(error, language: language)
        }
    }

    func refresh(quiet: Bool = false) async {
        guard let tripId = activeTripId else { return }
        if !quiet {
            isRefreshing = true
        }
        defer {
            if !quiet {
                isRefreshing = false
            }
        }

        do {
            snapshot = try await api.trip(id: tripId)
            errorMessage = nil
        } catch {
            if snapshot == nil {
                errorMessage = TripCopy.localizedError(error, language: language)
            }
        }
    }

    func leaveTrip() {
        activeTripId = nil
        snapshot = nil
        errorMessage = nil
        isLoading = false
    }

    func submitExpense(_ payload: CreateExpensePayload) async throws {
        guard let tripId = activeTripId else { return }
        isWorking = true
        defer { isWorking = false }

        try await api.addExpense(tripId: tripId, payload: payload)
        await refresh(quiet: true)
        showToast(language.text("支出已记入账本", "Expense added"))
    }

    func deleteExpense(_ expense: Expense) async throws {
        guard let tripId = activeTripId else { return }
        try await api.deleteExpense(tripId: tripId, expenseId: expense.id)
        await refresh(quiet: true)
        showToast(language.text("支出已删除", "Expense deleted"))
    }

    func addMember(name: String) async throws {
        guard let tripId = activeTripId else { return }
        isWorking = true
        defer { isWorking = false }

        _ = try await api.addMember(tripId: tripId, name: name)
        await refresh(quiet: true)
        showToast(language.text("成员已加入", "Traveler added"))
    }

    func removeMember(_ member: Member) async throws {
        guard let tripId = activeTripId else { return }
        try await api.removeMember(tripId: tripId, memberId: member.id)
        await refresh(quiet: true)
        showToast(language.text("成员已移除", "Traveler removed"))
    }

    func showToast(_ message: String) {
        toast = message
        Task { @MainActor [weak self] in
            try? await Task.sleep(for: .seconds(2.2))
            guard self?.toast == message else { return }
            self?.toast = nil
        }
    }

    func handleDeepLink(_ url: URL) async {
        guard url.scheme?.lowercased() == "aatrip" else { return }

        if url.host?.lowercased() == "auth" {
            await handleAuthDeepLink(url)
            return
        }

        if url.host == "trip" {
            let id = url.pathComponents.dropFirst().first
            if let id, !id.isEmpty {
                await openTrip(id)
            }
            return
        }

        if let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
           let code = components.queryItems?.first(where: { $0.name == "code" })?.value,
           code.count == 6 {
            do {
                try await joinTrip(code: code)
            } catch {
                errorMessage = TripCopy.localizedError(error, language: language)
            }
        }
    }

    private func restoreSession() async {
        do {
            let session = try await api.session()
            authProviders = session.providers
            if let user = session.user {
                authUser = user
                hasStoredAuth = true
            } else if hasStoredAuth {
                clearLocalAuth()
            }
        } catch {
            // A transient network error should not discard a valid Keychain session.
        }
    }

    private func handleAuthDeepLink(_ url: URL) async {
        guard let verifier = pendingAuthVerifier else {
            showToast(language.text("请从登录页面重新开始", "Start signing in again from the login page"))
            return
        }
        do {
            try await completeAuthCallback(url, verifier: verifier)
        } catch let error as AuthClientError where error.code == "auth_cancelled" {
            return
        } catch {
            showToast(TripCopy.localizedError(error, language: language))
        }
    }

    private func completeAuthCallback(_ url: URL, verifier: String) async throws {
        guard url.scheme?.lowercased() == "aatrip",
              url.host?.lowercased() == "auth",
              let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            throw AuthClientError(
                code: "auth_callback_invalid",
                message: "The sign-in response was invalid"
            )
        }

        let values = Dictionary(
            uniqueKeysWithValues: (components.queryItems ?? []).compactMap { item in
                item.value.map { (item.name, $0) }
            }
        )
        if let code = values["error"], !code.isEmpty {
            throw AuthClientError(code: code, message: "Sign-in was not completed")
        }
        guard let code = values["code"], !code.isEmpty else {
            throw AuthClientError(
                code: "auth_callback_invalid",
                message: "The sign-in response was incomplete"
            )
        }
        guard !handledAuthCodes.contains(code) else { return }
        handledAuthCodes.insert(code)

        do {
            let session = try await api.mobileExchange(code: code, verifier: verifier)
            try KeychainSessionStore.save(
                StoredAuthSession(token: session.token, expiresAt: session.expiresAt)
            )
            api.setAuthorizationToken(session.token)
            hasStoredAuth = true
            authUser = session.user
            pendingAuthVerifier = nil
            if let trip = snapshot?.trip {
                _ = try? await api.joinTrip(code: trip.inviteCode)
            }
            await loadMyTrips()
            showToast(language.text("登录成功", "Signed in"))
        } catch {
            handledAuthCodes.remove(code)
            throw error
        }
    }

    private func clearLocalAuth() {
        KeychainSessionStore.clear()
        api.setAuthorizationToken(nil)
        hasStoredAuth = false
        authUser = nil
        myTrips = []
        myTripsError = nil
        pendingAuthVerifier = nil
    }

    private func loadVisitStats() async {
        var visitorId = defaults.string(forKey: DefaultsKey.visitor)
        if visitorId == nil {
            visitorId = UUID().uuidString.lowercased()
            defaults.set(visitorId, forKey: DefaultsKey.visitor)
        }
        guard let visitorId else { return }

        do {
            visitStats = try await api.recordVisit(visitorId: visitorId)
        } catch {
            // Visit counters must never stand between a traveler and the ledger.
        }
    }
}
