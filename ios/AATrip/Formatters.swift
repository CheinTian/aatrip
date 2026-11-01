import Foundation

enum Money {
    static func string(
        cents: Int,
        currency: String,
        language: AppLanguage,
        signed: Bool = false
    ) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = language.locale
        formatter.currencyCode = currency
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2

        let value = Decimal(cents) / 100
        let amount = formatter.string(from: NSDecimalNumber(decimal: value)) ?? "\(value)"
        if signed, cents > 0 {
            return "+\(amount)"
        }
        if cents < 0 {
            return "-\(amount.replacingOccurrences(of: "-", with: ""))"
        }
        return amount
    }

    static func symbol(for currency: String) -> String {
        switch currency {
        case "CNY", "JPY": "¥"
        case "USD": "$"
        case "EUR": "€"
        case "THB": "฿"
        case "SGD": "S$"
        case "HKD": "HK$"
        default: currency
        }
    }

    static func cents(from input: String) -> Int {
        let normalized = input
            .replacingOccurrences(of: "，", with: "")
            .filter { $0.isNumber || $0 == "." || $0 == "-" }
        guard
            !normalized.isEmpty,
            let decimal = Decimal(string: normalized, locale: Locale(identifier: "en_US_POSIX")),
            decimal > 0
        else {
            return 0
        }

        var cents = decimal * 100
        var rounded = Decimal()
        NSDecimalRound(&rounded, &cents, 0, .plain)
        return NSDecimalNumber(decimal: rounded).intValue
    }
}

enum TripDates {
    private static let dayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        return formatter
    }()

    static func date(from value: String) -> Date? {
        dayFormatter.date(from: value)
    }

    static func string(from date: Date) -> String {
        dayFormatter.string(from: date)
    }

    static func todayString() -> String {
        string(from: Date())
    }

    static func display(_ value: String, language: AppLanguage, long: Bool = false) -> String {
        guard let date = date(from: value) else { return value }
        if long {
            return date.formatted(
                .dateTime
                    .locale(language.locale)
                    .month(.wide)
                    .day()
                    .weekday(.abbreviated)
            )
        }
        return date.formatted(
            .dateTime
                .locale(language.locale)
                .month(.abbreviated)
                .day()
        )
    }

    static func range(start: String, end: String, language: AppLanguage) -> String {
        if start.isEmpty, end.isEmpty {
            return language.text("日期待定", "Dates to be decided")
        }
        if !start.isEmpty, !end.isEmpty {
            return "\(display(start, language: language)) – \(display(end, language: language))"
        }
        return display(start.isEmpty ? end : start, language: language, long: true)
    }
}
