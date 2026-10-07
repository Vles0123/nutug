import SwiftUI

@main
struct NutugApp: App {
  init() { MongolianText.registerFont() }
  var body: some Scene {
    WindowGroup {
      RootView()
        #if os(macOS)
          .frame(minWidth: 900, minHeight: 650)
        #endif
    }
    #if os(macOS)
      .defaultSize(width: 1280, height: 900)
      .commands { CommandGroup(replacing: .newItem) {} }
    #endif
  }
}
