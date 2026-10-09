import SwiftUI

struct RootView: View {
  @StateObject private var model: AppModel
  @Environment(\.dynamicTypeSize) private var typeSize
  @ScaledMetric(relativeTo: .body) private var choiceLabelHeight: CGFloat = 84
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
    NavigationStack {
      content(page).background(skin.canvas)
        #if os(macOS)
          .toolbar { settingsButton }
        #endif
    }
    .environment(\.locale, Locale(identifier: "mn_Mong_CN"))
    .tint(skin.accent)
    .preferredColorScheme(skin.scheme)
    .background(skin.canvas)
    .sheet(isPresented: $model.settingsPresented) { settings }
  }
  @ViewBuilder private func content(_ page: NutugPage) -> some View {
    if page == .calendar {
      NativeCalendar(
        model: model.calendar, scale: model.readingScale, skin: skin,
        onSettings: { model.settingsPresented = true })
    } else {
      NativeHistory(
        store: model.history, scale: model.readingScale,
        onSettings: { model.settingsPresented = true })
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
        Section {
          LazyVGrid(
            columns: Array(
              repeating: GridItem(.flexible(), spacing: 8),
              count: typeSize.isAccessibilitySize ? 2 : 4), alignment: .leading,
            spacing: 12
          ) {
            ForEach(CalendarSkin.allCases) { value in
              Button {
                model.skin = value.rawValue
              } label: {
                VStack(spacing: 8) {
                  RoundedRectangle(cornerRadius: value == .ink ? 0 : 6)
                    .fill(value.canvas).frame(width: 34, height: 26)
                    .overlay(
                      RoundedRectangle(cornerRadius: value == .ink ? 0 : 6).stroke(
                        value.accent.opacity(0.6), lineWidth: 1))
                  MongolianLabel(text: Copy.calendar(value.rawValue), height: 76, size: 20)
                    .frame(height: choiceLabelHeight, alignment: .top)
                  Image(
                    systemName: model.skin == value.rawValue ? "checkmark.circle.fill" : "circle"
                  )
                  .foregroundStyle(model.skin == value.rawValue ? Color.accentColor : .secondary)
                  .accessibilityHidden(true)
                }.frame(maxWidth: .infinity, alignment: .top).padding(.vertical, 8)
              }.buttonStyle(.plain).accessibilityLabel(Copy.calendar(value.rawValue))
                .accessibilityAddTraits(model.skin == value.rawValue ? .isSelected : [])
            }
          }
        }
        Section {
          HStack(spacing: 20) {
            MongolianLabel(text: Copy.label("type"), scale: model.readingScale)
            VStack(alignment: .trailing, spacing: 12) {
              Slider(value: $model.readingScale, in: 0.85...1.5, step: 0.05)
                .accessibilityLabel(Copy.label("type"))
              Text("\(Int((model.readingScale*100).rounded()))%")
                .font(.footnote.monospacedDigit()).foregroundStyle(.secondary)
            }
          }
        }
        if page == .calendar {
          Section { CalendarTransferControls(store: model.calendar.appointments) }
        }
      }
      #if os(iOS)
        .listSectionSpacing(.compact)
        .safeAreaInset(edge: .top, spacing: 0) {
          NativeSheetHeader(
            title: Copy.label("settings"), onClose: { model.settingsPresented = false })
        }
      #else
        .toolbar {
          ToolbarItem(placement: .confirmationAction) {
            Button {
              model.settingsPresented = false
            } label: {
              Image(systemName: "checkmark")
            }
            .accessibilityLabel(Copy.label("close"))
          }
        }
      #endif
    }
    #if os(macOS)
      .frame(width: 520, height: 680)
    #endif
  }
}

private struct CalendarPreferences: View {
  @ObservedObject var model: CalendarModel
  var body: some View {
    Picker(selection: $model.showLunar) {
      ForEach([false, true], id: \.self) { dual in
        HStack(alignment: .top, spacing: 14) {
          Image(systemName: dual ? "moon" : "sun.max").foregroundStyle(.secondary)
          MongolianLabel(text: Copy.calendar("gregorian"))
          if dual {
            Text("+").foregroundStyle(.secondary)
            MongolianLabel(text: Copy.calendar("lunar"))
          }
        }.tag(dual)
      }
    } label: {
      MongolianLabel(text: Copy.label("calendar"))
    }
    .pickerStyle(.inline).labelsHidden()
    HStack(alignment: .top, spacing: 24) {
      MongolianLabel(text: Copy.calendar("firstWeekday"))
      Spacer(minLength: 0)
      HStack {
        ForEach([0, 6], id: \.self) { day in
          Button {
            model.firstWeekday = day
          } label: {
            VStack(spacing: 8) {
              MongolianLabel(text: Copy.weekdays[day], height: 64, size: 20)
              Image(systemName: model.firstWeekday == day ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(model.firstWeekday == day ? Color.accentColor : .secondary)
            }.padding(.horizontal, 8).frame(minWidth: 44)
          }
          .buttonStyle(.plain)
          .tint(model.firstWeekday == day ? Color.accentColor : .secondary)
          .accessibilityAddTraits(model.firstWeekday == day ? .isSelected : [])
        }
      }
    }
  }
}

struct NativeSheetHeader: View {
  let title: String
  let onClose: () -> Void
  var onSave: (() -> Void)? = nil
  var body: some View {
    HStack(spacing: 16) {
      if onSave != nil {
        Button(action: onClose) { Image(systemName: "xmark") }
          .buttonStyle(.borderless).accessibilityLabel(Copy.label("close"))
          .frame(minWidth: 44, minHeight: 44)
        Spacer(minLength: 0)
      }
      MongolianLabel(text: title, height: 70, size: 20)
      Spacer(minLength: 0)
      if let onSave {
        Button(action: onSave) { Image(systemName: "checkmark") }
          .buttonStyle(.borderedProminent).buttonBorderShape(.circle)
          .accessibilityLabel(Copy.calendar("save"))
      } else {
        Button(action: onClose) { Image(systemName: "xmark") }
          .buttonStyle(.borderless).accessibilityLabel(Copy.label("close"))
          .frame(minWidth: 44, minHeight: 44)
      }
    }.controlSize(.large).padding(.horizontal, 20).padding(.vertical, 10).background(.bar)
  }
}
