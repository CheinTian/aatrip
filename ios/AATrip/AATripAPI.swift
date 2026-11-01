import Foundation

struct AATripAPIError: LocalizedError, Sendable {
    let code: String
    let message: String
    let status: Int

    var errorDescription: String? { message }
}

private struct APIErrorBody: Decodable {
    let error: String?
    let code: String?
}

final class AATripAPI {
    private let baseURL: URL
    private let session: URLSession
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    init(baseURL: URL? = nil, session: URLSession = .shared) {
        let environmentURL = ProcessInfo.processInfo.environment["AATRIP_API_BASE_URL"]
            .flatMap(URL.init(string:))
        let plistURL = (
            Bundle.main.object(forInfoDictionaryKey: "AATRIP_API_BASE_URL") as? String
        ).flatMap(URL.init(string:))
        self.baseURL = baseURL
            ?? environmentURL
            ?? plistURL
            ?? URL(string: "https://aatrip.chein0813843.workers.dev")!
        self.session = session
    }

    func trip(id: String) async throws -> TripSnapshot {
        try await request(path: "/api/trips/\(id)")
    }

    func createTrip(_ payload: CreateTripPayload) async throws -> TripCreated {
        try await request(path: "/api/trips", method: "POST", body: payload)
    }

    func joinTrip(code: String) async throws -> TripLookup {
        try await request(
            path: "/api/trips/join",
            method: "POST",
            body: ["code": code.uppercased()]
        )
    }

    func createDemo(language: AppLanguage) async throws -> TripCreated {
        try await request(
            path: "/api/demo",
            method: "POST",
            body: ["locale": language.apiValue]
        )
    }

    func addExpense(tripId: String, payload: CreateExpensePayload) async throws {
        let _: IdentifierResponse = try await request(
            path: "/api/trips/\(tripId)/expenses",
            method: "POST",
            body: payload
        )
    }

    func deleteExpense(tripId: String, expenseId: String) async throws {
        let _: EmptyResponse = try await request(
            path: "/api/trips/\(tripId)/expenses/\(expenseId)",
            method: "DELETE"
        )
    }

    func addMember(tripId: String, name: String) async throws -> Member {
        try await request(
            path: "/api/trips/\(tripId)/members",
            method: "POST",
            body: ["name": name]
        )
    }

    func removeMember(tripId: String, memberId: String) async throws {
        let _: EmptyResponse = try await request(
            path: "/api/trips/\(tripId)/members/\(memberId)",
            method: "DELETE"
        )
    }

    func recordVisit(visitorId: String) async throws -> VisitStats {
        try await request(
            path: "/api/visits",
            method: "POST",
            body: ["visitorId": visitorId]
        )
    }

    private func request<Response: Decodable>(
        path: String,
        method: String = "GET"
    ) async throws -> Response {
        try await perform(path: path, method: method, bodyData: nil)
    }

    private func request<Body: Encodable, Response: Decodable>(
        path: String,
        method: String,
        body: Body
    ) async throws -> Response {
        let data = try encoder.encode(body)
        return try await perform(path: path, method: method, bodyData: data)
    }

    private func perform<Response: Decodable>(
        path: String,
        method: String,
        bodyData: Data?
    ) async throws -> Response {
        guard let url = URL(string: path, relativeTo: baseURL) else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = 20
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.httpBody = bodyData

        let (data, response) = try await session.data(for: request)
        guard let response = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }

        guard (200..<300).contains(response.statusCode) else {
            let body = try? decoder.decode(APIErrorBody.self, from: data)
            throw AATripAPIError(
                code: body?.code ?? "request_failed",
                message: body?.error ?? "",
                status: response.statusCode
            )
        }

        return try decoder.decode(Response.self, from: data)
    }
}

private struct IdentifierResponse: Decodable {
    let id: String
}
