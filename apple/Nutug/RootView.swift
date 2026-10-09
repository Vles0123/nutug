import SwiftUI

struct RootView: View {
  @StateObject private var model: AppModel
  init() { _model = StateObject(wrappedValue: AppModel()) }
  init(model: AppModel) { _model = StateObject(wrappedValue: model) }
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
        if page == .calendar {
          CalendarPreferences(model: model.calendar)
        }
        LazyVGrid(
          columns: [GridItem(.flexible()), GridItem(.flexible())], alignment: .leading, spacing: 16
        ) {
          ForEach(CalendarSkin.allCases) { value in
            Button {
              model.skin = value.rawValue
            } label: {
              VStack {
                Image(systemName: model.skin == value.rawValue ? "checkmark.circle.fill" : "circle")
                  .accessibilityHidden(true)
                RoundedRectangle(cornerRadius: value == .ink ? 0 : 8).fill(value.canvas).frame(
                  width: 42, height: 28
                ).overlay(Rectangle().stroke(value.accent, lineWidth: 2))
                MongolianText(text: Copy.calendar(value.rawValue), height: 110, size: 23)
              }
            }.buttonStyle(.bordered).accessibilityAddTraits(
              model.skin == value.rawValue ? .isSelected : [])
          }
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
    HStack(alignment: .top, spacing: 12) {
      ForEach([false, true], id: \.self) { dual in
        Button {
          model.showLunar = dual
        } label: {
          VStack(spacing: 12) {
            HStack {
              Image(systemName: "sun.max")
              if dual { Image(systemName: "moon") }
            }
            HStack(alignment: .top, spacing: 8) {
              MongolianText(text: Copy.calendar("gregorian"), height: 130, size: 23)
              if dual {
                Text("+")
                MongolianText(text: Copy.calendar("lunar"), height: 130, size: 23)
              }
            }
            Image(systemName: model.showLunar == dual ? "checkmark.circle.fill" : "circle")
          }.frame(maxWidth: .infinity)
        }.buttonStyle(.bordered).buttonBorderShape(.roundedRectangle(radius: 16))
          .tint(model.showLunar == dual ? Color.accentColor : .secondary)
          .accessibilityLabel(
            Copy.calendar("gregorian") + (dual ? " + " + Copy.calendar("lunar") : "")
          )
          .accessibilityAddTraits(model.showLunar == dual ? .isSelected : [])
      }
    }
    VStack(alignment: .leading, spacing: 12) {
      MongolianText(text: Copy.calendar("firstWeekday"), height: 150, size: 23)
      HStack {
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
    CalendarTransferControls(store: model.appointments)
  }
}
