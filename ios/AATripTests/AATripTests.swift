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
