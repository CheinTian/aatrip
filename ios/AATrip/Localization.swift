import Foundation

enum AppLanguage: String, CaseIterable, Identifiable, Sendable {
    case zhHans = "zh-Hans"
    case en

    var id: String { rawValue }

    var locale: Locale {
        Locale(identifier: rawValue)
    }

    var shortLabel: String {
        switch self {
        case .zhHans: "中"
        case .en: "EN"
        }
    }

    var displayName: String {
        switch self {
        case .zhHans: "中文"
        case .en: "English"
        }
    }

    var apiValue: String {
        switch self {
        case .zhHans: "zh-CN"
        case .en: "en-US"
        }
    }

    func text(_ chinese: String, _ english: String) -> String {
        self == .zhHans ? chinese : english
    }

    func count(_ value: Int, _ chineseUnit: String, _ englishSingular: String, _ englishPlural: String) -> String {
        if self == .zhHans {
            return "\(value) \(chineseUnit)"
        }
        return "\(value) \(value == 1 ? englishSingular : englishPlural)"
    }
}

enum TripCopy {
    static let categories: [(value: String, zh: String, en: String, symbol: String)] = [
        ("餐饮", "餐饮", "Food", "fork.knife"),
        ("住宿", "住宿", "Stay", "bed.double.fill"),
        ("交通", "交通", "Transport", "car.fill"),
        ("门票", "门票", "Tickets", "ticket.fill"),
        ("购物", "购物", "Shopping", "bag.fill"),
        ("其他", "其他", "Other", "ellipsis")
    ]

    static let currencies = [
        "CNY", "JPY", "THB", "USD", "EUR", "SGD", "HKD"
    ]

    static func categoryName(_ value: String, language: AppLanguage) -> String {
        guard let item = categories.first(where: { $0.value == value }) else {
            return value == "暂无"
                ? language.text("暂无", "No data")
                : value
        }
        return language.text(item.zh, item.en)
    }

    static func categorySymbol(_ value: String) -> String {
        categories.first(where: { $0.value == value })?.symbol ?? "ellipsis"
    }

    static func localizedError(_ error: Error, language: AppLanguage) -> String {
        if let authError = error as? AuthClientError {
            switch authError.code {
            case "auth_cancelled":
                return language.text("已取消登录", "Sign-in was cancelled")
            case "auth_not_configured":
                return language.text("这个登录方式暂未开通", "This sign-in option is not available yet")
            case "oauth_denied":
                return language.text("你取消了第三方授权", "You declined the provider authorization")
            case "oauth_state_invalid", "invalid_code_challenge":
                return language.text("登录验证已过期，请重试", "The sign-in check expired. Try again.")
            case "oauth_exchange_failed", "oauth_profile_failed":
                return language.text("无法完成第三方登录，请稍后重试", "The provider could not complete sign-in. Try again shortly.")
            case "mobile_code_expired", "mobile_code_used":
                return language.text("登录已过期，请重新尝试", "Sign-in expired. Please try again.")
            case "invalid_mobile_code", "invalid_mobile_verifier", "auth_callback_invalid", "auth_callback_missing":
                return language.text("登录响应不完整，请重新尝试", "The sign-in response was incomplete. Please try again.")
            case "auth_required":
                return language.text("请先登录", "Sign in first")
            case "membership_not_found":
                return language.text("你还没有加入这个行程", "You have not joined this trip")
            case "keychain_failed":
                return language.text("无法安全保存登录状态，请重试", "The sign-in session could not be saved securely")
            case "auth_session_unavailable":
                return language.text("无法打开登录页面，请稍后重试", "Could not open the sign-in page")
            case "auth_in_progress":
                return language.text("正在登录，请稍候", "A sign-in is already in progress")
            case "secure_random_failed":
                return language.text("无法创建安全登录请求，请重试", "Could not create a secure sign-in request")
            case "user_not_found":
                return language.text("账号不存在，请重新登录", "That account could not be found")
            default:
                break
            }
        }

        if let apiError = error as? AATripAPIError {
            switch apiError.code {
            case "trip_name_required", "trip_name_empty":
                return language.text("先给这次旅行起个名字", "Give this trip a name first")
            case "members_required":
                return language.text("至少留下一位同行成员", "Keep at least one traveler")
            case "invite_not_found":
                return language.text("没有找到这个行程码", "That trip code was not found")
            case "invalid_invite_code":
                return language.text("行程码格式不正确", "That trip code has an invalid format")
            case "expense_title_required":
                return language.text("请填写这笔支出是什么", "What was this expense for?")
            case "expense_amount_invalid":
                return language.text("请输入大于 0 的金额", "Enter an amount greater than 0")
            case "participants_required":
                return language.text("至少选择一位分摊成员", "Select at least one traveler to split with")
            case "custom_total_mismatch":
                return language.text("每个人金额之和必须等于支出总额", "The individual amounts must add up to the total")
            case "member_name_required":
                return language.text("请填写成员名字", "Enter a member name")
            case "member_limit":
                return language.text("单个行程最多 16 位成员", "A trip can have at most 16 members")
            case "member_has_expenses":
                return language.text("该成员已参与支出，暂不能删除", "This member is already part of an expense")
            case "trip_not_found":
                return language.text("行程不存在", "Trip not found")
            case "payer_not_found":
                return language.text("付款人不存在", "The selected payer was not found")
            default:
                break
            }
            if !apiError.message.isEmpty {
                return apiError.message
            }
        }

        if let urlError = error as? URLError, urlError.code == .notConnectedToInternet {
            return language.text("网络似乎断开了，请稍后重试", "You appear to be offline. Try again shortly.")
        }

        return language.text("操作没有完成，请稍后再试", "That did not work. Please try again.")
    }
}
