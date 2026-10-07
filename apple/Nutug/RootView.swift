import SwiftUI

struct RootView: View {
  @StateObject private var model = AppModel()
  @State private var visibility: NavigationSplitViewVisibility = .all
  #if os(iOS)
    @Environment(\.horizontalSizeClass) private var sizeClass
  #endif
  var body: some View {
    navigation
      .environment(\.locale, Locale(identifier: "mn_Mong_CN"))
      .sheet(isPresented: $model.settingsPresented) { settings }
  }
  @ViewBuilder private var navigation: some View {
    #if os(iOS)
      if sizeClass == .compact {
        TabView(selection: $model.page) {
          ForEach(NutugPage.allCases) { page in
            NavigationStack { content(page).toolbar { settingsButton } }
              .tabItem { Image(systemName: page.symbol).accessibilityLabel(page.title) }
              .tag(page)
          }
        }
      } else {
        splitNavigation
      }
    #else
      splitNavigation
    #endif
  }
  private var splitNavigation: some View {
    NavigationSplitView(columnVisibility: $visibility) {
      List(
        selection: Binding<NutugPage?>(
          get: { model.page }, set: { if let page = $0 { model.page = page } })
      ) {
        ForEach(NutugPage.allCases) { page in
          NavigationLink(value: page) {
            Label {
              MongolianText(text: page.title, height: 110, size: 24)
            } icon: {
              Image(systemName: page.symbol)
            }
          }
          .accessibilityLabel(page.title)
          .accessibilityIdentifier("page-" + page.rawValue)
        }
      }
      .listStyle(.sidebar)
      .navigationSplitViewColumnWidth(min: 135, ideal: 165, max: 220)
    } detail: {
      content(model.page)
        .toolbar(removing: .sidebarToggle)
        .toolbar {
          ToolbarItem(placement: .navigation) {
            Button {
              visibility = visibility == .detailOnly ? .all : .detailOnly
            } label: {
              Image(systemName: "sidebar.left")
            }
            .accessibilityLabel(Copy.label("catalog"))
          }
          settingsButton
        }
    }
  }
  @ViewBuilder private func content(_ page: NutugPage) -> some View {
    if page == .calendar {
      NativeCalendar(model: model.calendar)
    } else {
      NativeHistory(store: model.history, scale: model.readingScale)
    }
  }
  private var settingsButton: some ToolbarContent {
    ToolbarItem {
      Button {
        model.settingsPresented = true
      } label: {
        Image(systemName: "slider.horizontal.3")
      }.accessibilityLabel(Copy.label("settings"))
    }
  }
  private var settings: some View {
    NavigationStack {
      Form {
        MongolianText(text: Copy.label("type"), height: 170, size: 26)
        Slider(value: $model.readingScale, in: 0.85...1.5, step: 0.05).accessibilityLabel(
          Copy.label("type"))
        Text("\(Int((model.readingScale*100).rounded()))%").monospacedDigit()
        ScrollView(.horizontal) {
          MongolianText(text: Copy.label("chronicle"), height: 180, scale: model.readingScale)
        }
      }
      .toolbar {
        ToolbarItem(placement: .confirmationAction) {
          Button {
            model.settingsPresented = false
          } label: {
            Image(systemName: "checkmark")
          }.accessibilityLabel(Copy.label("close"))
        }
      }
    }
    #if os(macOS)
      .frame(width: 390, height: 520)
    #endif
  }
}
