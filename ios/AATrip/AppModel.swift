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
    }

    func launch() async {
        guard isLaunching else { return }
        defer { isLaunching = false }

        async let visitor: Void = loadVisitStats()

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
