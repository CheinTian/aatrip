import AuthenticationServices
import CryptoKit
import Foundation
import Security
import UIKit

struct AuthClientError: LocalizedError, Sendable {
    let code: String
    let message: String

    var errorDescription: String? { message }
}

struct PKCEPair: Sendable {
    let verifier: String
    let challenge: String

    init() throws {
        var bytes = [UInt8](repeating: 0, count: 32)
        guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else {
            throw AuthClientError(
                code: "secure_random_failed",
                message: "Could not create a secure sign-in request"
            )
        }
        self.init(verifier: Data(bytes).base64URLString)
    }

    init(verifier: String) {
        self.verifier = verifier
        let digest = SHA256.hash(data: Data(verifier.utf8))
        self.challenge = Data(digest).base64URLString
    }
}

extension Data {
    var base64URLString: String {
        base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}

struct StoredAuthSession: Codable, Sendable {
    let token: String
    let expiresAt: String

    var isExpired: Bool {
        guard let date = AuthDateParser.date(from: expiresAt) else { return false }
        return date <= Date()
    }
}

enum KeychainSessionStore {
    private static let service = "com.chein.aatrip.auth"
    private static let account = "oauth-session"

    static func save(_ session: StoredAuthSession) throws {
        let data = try JSONEncoder().encode(session)
        let identity: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        SecItemDelete(identity as CFDictionary)

        var item = identity
        item[kSecValueData as String] = data
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly

        let status = SecItemAdd(item as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw AuthClientError(
                code: "keychain_failed",
                message: "Could not save the sign-in session"
            )
        }
    }

    static func load() -> StoredAuthSession? {
        let identity: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: CFTypeRef?
        guard SecItemCopyMatching(identity as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else {
            return nil
        }
        return try? JSONDecoder().decode(StoredAuthSession.self, from: data)
    }

    static func clear() {
        let identity: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        SecItemDelete(identity as CFDictionary)
    }
}

enum AuthDateParser {
    static func date(from value: String) -> Date? {
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractional.date(from: value) {
            return date
        }
        return ISO8601DateFormatter().date(from: value)
    }
}

@MainActor
final class WebAuthSession: NSObject, ASWebAuthenticationPresentationContextProviding {
    private var session: ASWebAuthenticationSession?
    private var continuation: CheckedContinuation<URL, Error>?

    func authenticate(url: URL, callbackScheme: String) async throws -> URL {
        guard continuation == nil else {
            throw AuthClientError(
                code: "auth_in_progress",
                message: "A sign-in is already in progress"
            )
        }

        return try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation

            let authSession = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: callbackScheme
            ) { [weak self] callbackURL, error in
                Task { @MainActor in
                    self?.finish(callbackURL: callbackURL, error: error)
                }
            }
            authSession.presentationContextProvider = self
            authSession.prefersEphemeralWebBrowserSession = false
            session = authSession

            if !authSession.start() {
                finish(
                    callbackURL: nil,
                    error: AuthClientError(
                        code: "auth_session_unavailable",
                        message: "Could not open the sign-in page"
                    )
                )
            }
        }
    }

    private func finish(callbackURL: URL?, error: Error?) {
        guard let continuation else { return }
        self.continuation = nil
        session = nil

        if let error {
            if let authError = error as? ASWebAuthenticationSessionError,
               authError.code == .canceledLogin {
                continuation.resume(
                    throwing: AuthClientError(
                        code: "auth_cancelled",
                        message: "Sign-in was cancelled"
                    )
                )
            } else {
                continuation.resume(throwing: error)
            }
            return
        }

        guard let callbackURL else {
            continuation.resume(
                throwing: AuthClientError(
                    code: "auth_callback_missing",
                    message: "The sign-in response was incomplete"
                )
            )
            return
        }
        continuation.resume(returning: callbackURL)
    }

    func presentationAnchor(
        for session: ASWebAuthenticationSession
    ) -> ASPresentationAnchor {
        let activeScene = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive }
        return activeScene?.keyWindow
            ?? activeScene?.windows.first
            ?? UIWindow()
    }
}
