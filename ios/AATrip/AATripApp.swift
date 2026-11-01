import SwiftUI

@main
struct AATripApp: App {
    @State private var model = AppModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .environment(\.locale, model.language.locale)
                .tint(Color.ledgerOrange)
        }
    }
}
