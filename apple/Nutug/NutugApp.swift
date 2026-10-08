import SwiftUI

@main
struct NutugApp: App {
  init() { MongolianText.registerFont() }
  private var appTitle: String {
    #if NUTUG_HISTORY
      Copy.label("chronicle")
    #else
      Copy.label("calendar")
    #endif
  }
  var body: some Scene {
    WindowGroup(appTitle) {
      RootView()
        #if os(macOS)
          .frame(minWidth: 640, minHeight: 560)
        #endif
    }
    #if os(macOS)
      .defaultSize(width: 1280, height: 900)
      .commands { CommandGroup(replacing: .newItem) {} }
    #endif
  }
}
