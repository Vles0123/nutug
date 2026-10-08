import SwiftUI

struct RootView: View {
  @StateObject private var model = AppModel()
  private var page: NutugPage {
    #if NUTUG_HISTORY
      .chronicle
    #else
      .calendar
    #endif
  }
  private var skin: CalendarSkin { CalendarSkin(rawValue: model.skin) ?? .light }
  var body: some View {
    NavigationStack { content(page).background(skin.canvas).toolbar { settingsButton } }
      .environment(\.locale, Locale(identifier: "mn_Mong_CN"))
      .tint(skin.accent)
      .preferredColorScheme(skin.scheme)
      .background(skin.canvas)
      .sheet(isPresented: $model.settingsPresented) { settings }
  }
  @ViewBuilder private func content(_ page: NutugPage) -> some View {
    if page == .calendar {
      NativeCalendar(model: model.calendar, scale: model.readingScale, skin: skin)
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
        HStack(alignment: .top, spacing: 12) {
          ForEach(CalendarSkin.allCases) { value in
            Button {
              model.skin = value.rawValue
            } label: {
              VStack {
                RoundedRectangle(cornerRadius: value == .ink ? 0 : 8).fill(value.canvas).frame(
                  width: 42, height: 28
                ).overlay(Rectangle().stroke(value.accent, lineWidth: 2))
                MongolianText(text: Copy.calendar(value.rawValue), height: 110, size: 23)
              }
            }.buttonStyle(.bordered).accessibilityAddTraits(
              model.skin == value.rawValue ? .isSelected : [])
          }
        }
        if page == .calendar {
          CalendarPreferences(model: model.calendar)
        }
        MongolianText(text: Copy.label("type"), height: 170, size: 26)
        Slider(value: $model.readingScale, in: 0.85...1.5, step: 0.05).accessibilityLabel(
          Copy.label("type"))
        Text("\(Int((model.readingScale*100).rounded()))%").monospacedDigit()
        ScrollView(.horizontal) {
          MongolianText(text: Copy.label(page.rawValue), height: 180, scale: model.readingScale)
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
      .frame(width: 520, height: 680)
    #endif
  }
}

private struct CalendarPreferences: View {
  @ObservedObject var model: CalendarModel
  var body: some View {
    CalendarTransferControls(store: model.appointments)
    Toggle(isOn: $model.showLunar) {
      MongolianText(text: Copy.calendar("lunar"), height: 150, size: 23)
    }
    HStack {
      MongolianText(text: Copy.calendar("firstWeekday"), height: 150, size: 23)
      ForEach([0, 6], id: \.self) { day in
        Button {
          model.firstWeekday = day
        } label: {
          MongolianText(text: Copy.weekdays[day], height: 90, size: 23)
        }
        .buttonStyle(.bordered)
        .tint(model.firstWeekday == day ? Color.accentColor : .secondary)
        .accessibilityAddTraits(model.firstWeekday == day ? .isSelected : [])
      }
    }
  }
}
