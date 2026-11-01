import SwiftUI

struct RootView: View {
    @Environment(AppModel.self) private var model
    @State private var hasLaunched = false

    var body: some View {
        ZStack {
            LedgerBackground()

            if model.isLaunching {
                LaunchView()
                    .transition(.opacity)
            } else if let tripId = model.activeTripId {
                if let snapshot = model.snapshot {
                    TripShellView(snapshot: snapshot)
                        .id(tripId)
                        .transition(.opacity)
                } else if let errorMessage = model.errorMessage, !model.isLoading {
                    TripErrorView(
                        message: errorMessage,
                        language: model.language,
                        retry: {
                            Task { await model.openTrip(tripId) }
                        },
                        goHome: model.leaveTrip
                    )
                    .transition(.opacity)
                } else {
                    TripLoadingView(language: model.language)
                        .transition(.opacity)
                }
            } else {
                WelcomeView()
                    .transition(.opacity)
            }

            if let toast = model.toast {
                VStack {
                    Spacer()
                    ToastBanner(text: toast)
                        .padding(.bottom, model.activeTripId == nil ? 24 : 92)
                }
                .padding(.horizontal, 24)
                .transition(.move(edge: .bottom).combined(with: .opacity))
                .zIndex(10)
            }
        }
        .animation(.easeInOut(duration: 0.22), value: model.activeTripId)
        .animation(.easeInOut(duration: 0.2), value: model.isLaunching)
        .animation(.snappy(duration: 0.28), value: model.toast)
        .task {
            guard !hasLaunched else { return }
            hasLaunched = true
            await model.launch()
        }
        .onOpenURL { url in
            Task { await model.handleDeepLink(url) }
        }
    }
}

private struct LaunchView: View {
    @ScaledMetric(relativeTo: .largeTitle) private var markSize: CGFloat = 58

    var body: some View {
        VStack(spacing: 20) {
            BrandMark(size: markSize)
            VStack(spacing: 4) {
                Text("AA簿")
                    .font(.system(.title, design: .serif).weight(.black))
                    .foregroundStyle(Color.ledgerInk)
                Text("TRAVEL LEDGER")
                    .font(.system(size: 9, weight: .medium, design: .monospaced))
                    .tracking(1.7)
                    .foregroundStyle(Color.ledgerSecondary)
            }
            ProgressView()
                .tint(Color.ledgerOrange)
                .padding(.top, 8)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("AA簿")
    }
}

private struct TripLoadingView: View {
    let language: AppLanguage

    var body: some View {
        VStack(spacing: 14) {
            ProgressView()
                .controlSize(.large)
                .tint(Color.ledgerOrange)
            Text(language.text("正在翻开账本…", "Opening the ledger…"))
                .font(.subheadline)
                .foregroundStyle(Color.ledgerSecondary)
        }
    }
}

private struct TripErrorView: View {
    let message: String
    let language: AppLanguage
    let retry: () -> Void
    let goHome: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "book.closed.fill")
                .font(.system(size: 30, weight: .medium))
                .foregroundStyle(Color.ledgerOrange)
                .frame(width: 66, height: 66)
                .background(Color.ledgerGoldSoft)
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))

            Text(language.text("这个账本暂时打不开", "This ledger cannot be opened"))
                .font(.system(.title2, design: .serif).weight(.bold))
                .foregroundStyle(Color.ledgerInk)

            Text(message)
                .font(.subheadline)
                .foregroundStyle(Color.ledgerSecondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 310)

            Button(language.text("重试", "Try again"), action: retry)
                .buttonStyle(PrimaryActionStyle())
                .frame(maxWidth: 300)
                .padding(.top, 4)

            Button(language.text("返回首页", "Back home"), action: goHome)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Color.ledgerSecondary)
        }
        .padding(28)
    }
}
