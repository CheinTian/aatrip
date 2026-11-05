import XCTest
@testable import AATrip

final class AATripTests: XCTestCase {
    func testSnapshotDecoding() throws {
        let json = """
        {
          "trip": {
            "id": "trip-1",
            "name": "云南七日慢旅行",
            "destination": "大理 · 丽江",
            "startDate": "2026-10-18",
            "endDate": "2026-10-24",
            "currency": "CNY",
            "inviteCode": "7H63M7",
            "createdAt": "2026-11-01T06:55:12.274Z"
          },
          "members": [
            {
              "id": "member-1",
              "name": "阿岚",
              "color": "#F05A36",
              "createdAt": "2026-11-01T06:55:12.274Z"
            }
          ],
          "expenses": [],
          "balances": [],
          "settlements": [],
          "summary": {
            "totalCents": 0,
            "expenseCount": 0,
            "perPersonCents": 0,
            "topCategory": "暂无"
          }
        }
        """.data(using: .utf8)!

        let snapshot = try JSONDecoder().decode(TripSnapshot.self, from: json)
        XCTAssertEqual(snapshot.trip.inviteCode, "7H63M7")
        XCTAssertEqual(snapshot.members.first?.name, "阿岚")
    }

    func testMoneyParsing() {
        XCTAssertEqual(Money.cents(from: "128.50"), 12_850)
        XCTAssertEqual(Money.cents(from: "¥1,208.06"), 120_806)
        XCTAssertEqual(Money.cents(from: "0"), 0)
        XCTAssertEqual(Money.cents(from: "not money"), 0)
    }

    func testDateOnlyParsingIgnoresLocalTimeZone() {
        XCTAssertEqual(TripDates.string(from: TripDates.date(from: "2026-10-18")!), "2026-10-18")
    }

    func testLocalizedAPIErrors() {
        let error = AATripAPIError(
            code: "custom_total_mismatch",
            message: "自定义错误",
            status: 400
        )
        XCTAssertEqual(
            TripCopy.localizedError(error, language: .en),
            "The individual amounts must add up to the total"
        )
    }

    func testPKCEMatchesRFC7636Example() {
        let pkce = PKCEPair(
            verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
        )
        XCTAssertEqual(
            pkce.challenge,
            "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
        )
    }

    func testAuthModelsDecodeSessionAndTrips() throws {
        let sessionJSON = """
        {
          "user": {
            "id": "user-1",
            "name": "Traveler",
            "email": "traveler@example.com",
            "avatarUrl": "https://example.com/avatar.png",
            "providers": ["google", "github"]
          },
          "providers": { "google": true, "github": false }
        }
        """.data(using: .utf8)!
        let session = try JSONDecoder().decode(AuthSession.self, from: sessionJSON)
        XCTAssertEqual(session.user?.providers, [.google, .github])
        XCTAssertTrue(session.providers.google)
        XCTAssertFalse(session.providers.github)

        let tripsJSON = """
        {
          "trips": [
            {
              "id": "trip-1",
              "name": "云南七日慢旅行",
              "destination": "大理 · 丽江",
              "startDate": "2026-10-18",
              "endDate": "2026-10-24",
              "currency": "CNY",
              "inviteCode": "7H63M7",
              "role": "owner",
              "joinedAt": "2026-11-01T06:55:12.274Z",
              "memberCount": 3,
              "expenseCount": 5,
              "totalCents": 128500,
              "lastActivityAt": "2026-11-01T06:55:12.274Z"
            }
          ]
        }
        """.data(using: .utf8)!
        let trips = try JSONDecoder().decode(UserTripsResponse.self, from: tripsJSON)
        XCTAssertEqual(trips.trips.first?.role, "owner")
        XCTAssertEqual(trips.trips.first?.totalCents, 128_500)
    }

    func testMobileAuthStartURLUsesPKCEAndNativeClient() throws {
        let api = AATripAPI(baseURL: URL(string: "https://example.com")!)
        let url = try api.authStartURL(provider: .github, challenge: "challenge")
        let components = try XCTUnwrap(
            URLComponents(url: url, resolvingAgainstBaseURL: false)
        )
        let values = Dictionary(
            uniqueKeysWithValues: (components.queryItems ?? []).compactMap { item in
                item.value.map { (item.name, $0) }
            }
        )

        XCTAssertEqual(components.path, "/api/auth/github/start")
        XCTAssertEqual(values["client"], "ios")
        XCTAssertEqual(values["code_challenge"], "challenge")
        XCTAssertEqual(values["next"], "/#/trips")
    }

    func testKeychainSessionRoundTrip() throws {
        let session = StoredAuthSession(
            token: "test-token",
            expiresAt: "2099-01-01T00:00:00.000Z"
        )
        defer { KeychainSessionStore.clear() }

        try KeychainSessionStore.save(session)
        let restored = try XCTUnwrap(KeychainSessionStore.load())

        XCTAssertEqual(restored.token, session.token)
        XCTAssertEqual(restored.expiresAt, session.expiresAt)
        XCTAssertFalse(restored.isExpired)
    }

    func testTripSharingUsesURLAndKeepsInviteDetailsInMessage() {
        let trip = Trip(
            id: "trip-1",
            name: "云南七日慢旅行",
            destination: "大理 · 丽江",
            startDate: "2026-10-18",
            endDate: "2026-10-24",
            currency: "CNY",
            inviteCode: "7H63M7",
            createdAt: "2026-11-01T06:55:12.274Z"
        )

        XCTAssertEqual(
            TripSharing.tripURL(trip).absoluteString,
            "https://aatrip.chein0813843.workers.dev/#/trip/trip-1"
        )
        XCTAssertEqual(
            TripSharing.inviteMessage(trip, language: .zhHans),
            "AA簿邀请：云南七日慢旅行\n行程码：7H63M7"
        )
    }
}
