import SwiftUI

extension Color {
    static let ledgerInk = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.96, green: 0.95, blue: 0.91, alpha: 1)
            : UIColor(red: 0.09, green: 0.14, blue: 0.12, alpha: 1)
    })

    static let ledgerSecondary = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.66, green: 0.71, blue: 0.68, alpha: 1)
            : UIColor(red: 0.35, green: 0.40, blue: 0.37, alpha: 1)
    })

    static let ledgerPaper = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.065, green: 0.085, blue: 0.075, alpha: 1)
            : UIColor(red: 0.953, green: 0.945, blue: 0.922, alpha: 1)
    })

    static let ledgerSurface = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.105, green: 0.135, blue: 0.12, alpha: 1)
            : UIColor(red: 1, green: 0.998, blue: 0.98, alpha: 1)
    })

    static let ledgerLine = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.22, green: 0.26, blue: 0.24, alpha: 1)
            : UIColor(red: 0.82, green: 0.83, blue: 0.79, alpha: 1)
    })

    static let ledgerForest = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.07, green: 0.17, blue: 0.13, alpha: 1)
            : UIColor(red: 0.09, green: 0.23, blue: 0.17, alpha: 1)
    })

    static let ledgerForestLift = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.10, green: 0.24, blue: 0.18, alpha: 1)
            : UIColor(red: 0.13, green: 0.30, blue: 0.22, alpha: 1)
    })

    static let ledgerOrange = Color(red: 0.91, green: 0.36, blue: 0.22)
    static let ledgerGold = Color(red: 0.89, green: 0.64, blue: 0.16)
    static let ledgerTeal = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.33, green: 0.77, blue: 0.66, alpha: 1)
            : UIColor(red: 0.11, green: 0.56, blue: 0.47, alpha: 1)
    })

    static let ledgerRed = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 1.0, green: 0.51, blue: 0.48, alpha: 1)
            : UIColor(red: 0.73, green: 0.23, blue: 0.23, alpha: 1)
    })

    static let ledgerBlue = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.52, green: 0.68, blue: 0.95, alpha: 1)
            : UIColor(red: 0.21, green: 0.41, blue: 0.68, alpha: 1)
    })

    static let ledgerPurple = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.76, green: 0.58, blue: 0.84, alpha: 1)
            : UIColor(red: 0.54, green: 0.30, blue: 0.61, alpha: 1)
    })

    static let ledgerGoldSoft = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.18, green: 0.16, blue: 0.09, alpha: 1)
            : UIColor(red: 1.0, green: 0.965, blue: 0.85, alpha: 1)
    })

    static let ledgerTealSoft = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.08, green: 0.20, blue: 0.17, alpha: 1)
            : UIColor(red: 0.89, green: 0.96, blue: 0.93, alpha: 1)
    })

    static let ledgerGrid = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(white: 1, alpha: 0.035)
            : UIColor(red: 0.09, green: 0.14, blue: 0.12, alpha: 0.045)
    })

    init(hex: String) {
        let clean = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var value: UInt64 = 0
        Scanner(string: clean).scanHexInt64(&value)
        let red: Double
        let green: Double
        let blue: Double
        switch clean.count {
        case 3:
            red = Double((value >> 8) & 0xF) / 15
            green = Double((value >> 4) & 0xF) / 15
            blue = Double(value & 0xF) / 15
        default:
            red = Double((value >> 16) & 0xFF) / 255
            green = Double((value >> 8) & 0xFF) / 255
            blue = Double(value & 0xFF) / 255
        }
        self.init(red: red, green: green, blue: blue)
    }
}

struct LedgerBackground: View {
    var body: some View {
        ZStack {
            Color.ledgerPaper
            Canvas { context, size in
                let spacing: CGFloat = 24
                var path = Path()
                stride(from: 0, through: size.width, by: spacing).forEach { x in
                    path.move(to: CGPoint(x: x, y: 0))
                    path.addLine(to: CGPoint(x: x, y: size.height))
                }
                stride(from: 0, through: size.height, by: spacing).forEach { y in
                    path.move(to: CGPoint(x: 0, y: y))
                    path.addLine(to: CGPoint(x: size.width, y: y))
                }
                context.stroke(path, with: .color(.ledgerGrid), lineWidth: 0.5)
            }
        }
        .ignoresSafeArea()
        .accessibilityHidden(true)
    }
}

struct PaperCard: ViewModifier {
    var padding: CGFloat = 18

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(Color.ledgerSurface)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(Color.ledgerLine, lineWidth: 1)
            }
            .shadow(color: .black.opacity(0.035), radius: 18, y: 8)
    }
}

extension View {
    func paperCard(padding: CGFloat = 18) -> some View {
        modifier(PaperCard(padding: padding))
    }
}

struct PressableButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.975 : 1)
            .opacity(configuration.isPressed ? 0.88 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

struct PrimaryActionStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .frame(maxWidth: .infinity, minHeight: 52)
            .foregroundStyle(.white)
            .background(Color.ledgerOrange)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .opacity(isEnabled ? (configuration.isPressed ? 0.86 : 1) : 0.46)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
            .animation(.easeOut(duration: 0.12), value: isEnabled)
    }
}

struct SecondaryActionStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .frame(maxWidth: .infinity, minHeight: 50)
            .foregroundStyle(Color.ledgerInk)
            .background(Color.ledgerSurface.opacity(configuration.isPressed ? 0.62 : 1))
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(Color.ledgerLine, lineWidth: 1)
            }
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .opacity(isEnabled ? 1 : 0.5)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
            .animation(.easeOut(duration: 0.12), value: isEnabled)
    }
}

struct BrandMark: View {
    var size: CGFloat = 44

    var body: some View {
        Text("AA")
            .font(.system(size: size * 0.38, weight: .black, design: .serif))
            .foregroundStyle(.white)
            .frame(width: size, height: size)
            .background(Color.ledgerOrange)
            .clipShape(RoundedRectangle(cornerRadius: size * 0.24, style: .continuous))
            .overlay(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: size * 0.24, style: .continuous)
                    .stroke(.white.opacity(0.22), lineWidth: 1)
                    .padding(2)
            }
            .accessibilityHidden(true)
    }
}

struct BrandLockup: View {
    var compact = false

    var body: some View {
        HStack(spacing: 11) {
            BrandMark(size: compact ? 38 : 44)
            VStack(alignment: .leading, spacing: 1) {
                Text("AA簿")
                    .font(.system(.title3, design: .serif).weight(.black))
                if !compact {
                    Text("TRAVEL LEDGER")
                        .font(.system(size: 9, weight: .medium, design: .monospaced))
                        .tracking(1.3)
                        .foregroundStyle(Color.ledgerSecondary)
                }
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("AA簿")
    }
}

struct AvatarView: View {
    let name: String
    let color: String
    var size: CGFloat = 40

    var body: some View {
        Text(initials)
            .font(.system(size: size * 0.28, weight: .semibold, design: .monospaced))
            .foregroundStyle(.white)
            .frame(width: size, height: size)
            .background(Color(hex: color))
            .clipShape(Circle())
            .overlay {
                Circle().stroke(.white.opacity(0.2), lineWidth: 1)
            }
            .accessibilityLabel(name)
    }

    private var initials: String {
        String(name.trimmingCharacters(in: .whitespacesAndNewlines).suffix(2)).uppercased()
    }
}

struct CategoryGlyph: View {
    let category: String
    var size: CGFloat = 40

    private var tone: (foreground: Color, background: Color) {
        switch category {
        case "餐饮":
            (.ledgerOrange, .ledgerOrange.opacity(0.12))
        case "住宿":
            (.ledgerTeal, .ledgerTeal.opacity(0.12))
        case "交通":
            (.ledgerBlue, .ledgerBlue.opacity(0.13))
        case "门票":
            (Color(red: 0.60, green: 0.42, blue: 0.06), .ledgerGoldSoft)
        case "购物":
            (.ledgerPurple, .ledgerPurple.opacity(0.13))
        default:
            (.ledgerSecondary, Color.ledgerLine.opacity(0.28))
        }
    }

    var body: some View {
        Image(systemName: TripCopy.categorySymbol(category))
            .font(.system(size: size * 0.4, weight: .semibold))
            .foregroundStyle(tone.foreground)
            .frame(width: size, height: size)
            .background(tone.background)
            .clipShape(RoundedRectangle(cornerRadius: size * 0.28, style: .continuous))
            .accessibilityHidden(true)
    }
}

struct RouteTrack: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    let destination: String
    let startDate: String
    let endDate: String
    let language: AppLanguage
    var dark = true

    var body: some View {
        Group {
            if dynamicTypeSize.isAccessibilitySize {
                compactLayout
            } else {
                regularLayout
            }
        }
        .foregroundStyle(dark ? .white : Color.ledgerInk)
        .opacity(dark ? 0.94 : 1)
    }

    private var regularLayout: some View {
        VStack(spacing: 9) {
            routeRule
                .frame(height: 18)

            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(TripDates.display(startDate, language: language))
                        .font(.caption.weight(.semibold))
                    Text(language.text("出发", "Depart"))
                        .font(.caption2)
                }
                Spacer(minLength: 20)
                VStack(spacing: 2) {
                    Text(destination.isEmpty ? language.text("目的地待定", "Destination pending") : destination)
                        .font(.subheadline.weight(.bold))
                        .lineLimit(1)
                    Text(language.text("目的地", "Destination"))
                        .font(.caption2)
                }
                .multilineTextAlignment(.center)
                Spacer(minLength: 20)
                VStack(alignment: .trailing, spacing: 2) {
                    Text(TripDates.display(endDate, language: language))
                        .font(.caption.weight(.semibold))
                    Text(language.text("返程", "Return"))
                        .font(.caption2)
                }
            }
        }
    }

    private var compactLayout: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 9) {
                Circle()
                    .fill(Color.ledgerGold)
                    .frame(width: 8, height: 8)
                Text(destination.isEmpty ? language.text("目的地待定", "Destination pending") : destination)
                    .font(.subheadline.weight(.bold))
                    .lineLimit(2)
                Spacer(minLength: 6)
                Circle()
                    .fill(Color.ledgerGold)
                    .frame(width: 8, height: 8)
            }

            HStack {
                Text(TripDates.display(startDate, language: language))
                    .font(.caption.weight(.semibold))
                Spacer()
                Text(TripDates.display(endDate, language: language))
                    .font(.caption.weight(.semibold))
            }
        }
    }

    private var routeRule: some View {
        HStack(spacing: 9) {
            Circle()
                .fill(Color.ledgerGold)
                .frame(width: 8, height: 8)
                .overlay { Circle().stroke(Color.ledgerGold.opacity(0.3), lineWidth: 5) }

            DashedRule()

            Image(systemName: "location.fill")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(Color.ledgerOrange)

            DashedRule()

            Circle()
                .fill(Color.ledgerGold)
                .frame(width: 8, height: 8)
                .overlay { Circle().stroke(Color.ledgerGold.opacity(0.3), lineWidth: 5) }
        }
    }
}

private struct DashedRule: View {
    var body: some View {
        GeometryReader { proxy in
            Path { path in
                path.move(to: CGPoint(x: 0, y: proxy.size.height / 2))
                path.addLine(to: CGPoint(x: proxy.size.width, y: proxy.size.height / 2))
            }
            .stroke(
                style: StrokeStyle(lineWidth: 1, dash: [4, 5])
            )
            .foregroundStyle(.secondary.opacity(0.42))
        }
        .frame(height: 12)
    }
}

struct SectionTitle: View {
    let title: String
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title)
                .font(.title3.weight(.bold))
                .foregroundStyle(Color.ledgerInk)
            Spacer()
            if let actionTitle, let action {
                Button(actionTitle, action: action)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.ledgerOrange)
            }
        }
    }
}

struct StatPill: View {
    let symbol: String
    let value: String
    let label: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: symbol)
                .font(.caption.weight(.semibold))
                .foregroundStyle(Color.ledgerOrange)
            VStack(alignment: .leading, spacing: 1) {
                Text(value)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.ledgerInk)
                Text(label)
                    .font(.caption2)
                    .foregroundStyle(Color.ledgerSecondary)
            }
        }
    }
}

struct ToastBanner: View {
    let text: String

    var body: some View {
        HStack(spacing: 9) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(Color.ledgerGold)
            Text(text)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white)
        }
        .padding(.horizontal, 16)
        .frame(minHeight: 48)
        .background(Color.ledgerForest)
        .clipShape(Capsule())
        .shadow(color: .black.opacity(0.2), radius: 20, y: 8)
        .accessibilityAddTraits(.isStaticText)
    }
}

struct ErrorBanner: View {
    let text: String
    var retry: (() -> Void)?

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(Color.ledgerRed)
            Text(text)
                .font(.subheadline)
                .foregroundStyle(Color.ledgerInk)
                .frame(maxWidth: .infinity, alignment: .leading)
            if let retry {
                Button("重试", action: retry)
                    .font(.subheadline.weight(.semibold))
            }
        }
        .padding(14)
        .background(Color.ledgerSurface)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(Color.ledgerRed.opacity(0.35), lineWidth: 1)
        }
    }
}

struct EmptyLedgerView: View {
    let symbol: String
    let title: String
    let message: String
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: symbol)
                .font(.system(size: 26, weight: .medium))
                .foregroundStyle(Color.ledgerOrange)
                .frame(width: 58, height: 58)
                .background(Color.ledgerGoldSoft)
                .clipShape(Circle())
            Text(title)
                .font(.headline)
                .foregroundStyle(Color.ledgerInk)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(Color.ledgerSecondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 300)
            if let actionTitle, let action {
                Button(actionTitle, action: action)
                    .font(.subheadline.weight(.semibold))
                    .buttonStyle(.borderedProminent)
                    .tint(Color.ledgerOrange)
                    .padding(.top, 2)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 36)
        .padding(.horizontal, 24)
    }
}
