import Foundation

struct TripSnapshot: Codable, Sendable {
    let trip: Trip
    let members: [Member]
    let expenses: [Expense]
    let balances: [MemberBalance]
    let settlements: [Settlement]
    let summary: TripSummary
}

struct Trip: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let name: String
    let destination: String
    let startDate: String
    let endDate: String
    let currency: String
    let inviteCode: String
    let createdAt: String
}

struct Member: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let name: String
    let color: String
    let createdAt: String
}

struct Expense: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let tripId: String
    let title: String
    let amountCents: Int
    let category: String
    let paidBy: String
    let date: String
    let notes: String
    let splitMode: SplitMode
    let createdAt: String
    let shares: [ExpenseShare]
}

struct ExpenseShare: Codable, Hashable, Sendable {
    let memberId: String
    let amountCents: Int
}

enum SplitMode: String, Codable, Sendable {
    case equal
    case custom
}

struct MemberBalance: Codable, Identifiable, Hashable, Sendable {
    var id: String { memberId }

    let memberId: String
    let name: String
    let color: String
    let paidCents: Int
    let owedCents: Int
    let netCents: Int
}

struct Settlement: Codable, Identifiable, Hashable, Sendable {
    var id: String { "\(fromMemberId)-\(toMemberId)" }

    let fromMemberId: String
    let fromName: String
    let toMemberId: String
    let toName: String
    let amountCents: Int
}

struct TripSummary: Codable, Hashable, Sendable {
    let totalCents: Int
    let expenseCount: Int
    let perPersonCents: Int
    let topCategory: String
}

struct CreateTripPayload: Encodable, Sendable {
    let name: String
    let destination: String
    let startDate: String
    let endDate: String
    let currency: String
    let members: [String]
}

struct CreateExpensePayload: Encodable, Sendable {
    let title: String
    let amountCents: Int
    let category: String
    let paidBy: String
    let date: String
    let notes: String
    let splitMode: SplitMode
    let participants: [String]
    let customShares: [ExpenseShare]
}

struct TripCreated: Decodable, Sendable {
    let id: String
    let inviteCode: String
}

struct TripLookup: Decodable, Sendable {
    let id: String
}

struct VisitStats: Decodable, Sendable {
    let totalVisitors: Int
    let todayVisitors: Int
    let totalViews: Int
    let todayViews: Int
    let date: String
}

enum AuthProvider: String, CaseIterable, Codable, Identifiable, Sendable {
    case google
    case github

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .google: "Google"
        case .github: "GitHub"
        }
    }
}

struct AuthProviders: Codable, Equatable, Sendable {
    let google: Bool
    let github: Bool

    static let none = AuthProviders(google: false, github: false)

    func isEnabled(_ provider: AuthProvider) -> Bool {
        switch provider {
        case .google: google
        case .github: github
        }
    }
}

struct AuthUser: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let name: String
    let email: String
    let avatarUrl: String
    let providers: [AuthProvider]
}

struct AuthSession: Decodable, Sendable {
    let user: AuthUser?
    let providers: AuthProviders
}

struct MobileAuthToken: Decodable, Sendable {
    let token: String
    let expiresAt: String
    let user: AuthUser
}

struct UserTrip: Decodable, Identifiable, Hashable, Sendable {
    let id: String
    let name: String
    let destination: String
    let startDate: String
    let endDate: String
    let currency: String
    let inviteCode: String
    let role: String
    let joinedAt: String
    let memberCount: Int
    let expenseCount: Int
    let totalCents: Int
    let lastActivityAt: String
}

struct UserTripsResponse: Decodable, Sendable {
    let trips: [UserTrip]
}

struct EmptyResponse: Decodable, Sendable {
    let ok: Bool
}
