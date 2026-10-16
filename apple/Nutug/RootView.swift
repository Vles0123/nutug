import SwiftUI
import UniformTypeIdentifiers

struct RootView: View {
  @ObservedObject private var themes: CustomThemeStore
  @StateObject private var model: AppModel
  @Environment(\.dynamicTypeSize) private var typeSize
  @ScaledMetric(relativeTo: .body) private var choiceLabelHeight: CGFloat = 84
  init() {
    let value = AppModel()
    _model = StateObject(wrappedValue: value)
    _themes = ObservedObject(wrappedValue: value.themes)
  }
  init(model: AppModel) {
    _model = StateObject(wrappedValue: model)
    _themes = ObservedObject(wrappedValue: model.themes)
  }
  private var page: NutugPage {
    #if NUTUG_HISTORY
      .chronicle
    #else
      .calendar
    #endif
  }
  private var skin: CalendarSkin {
    if let theme = themes.items.first(where: { "custom:" + $0.id == model.skin }) {
      return CalendarSkin(theme: theme)
    }
    return CalendarSkin(rawValue: model.skin) ?? .light
  }
  var body: some View {
    NavigationStack {
      content(page).background(skin.canvas).foregroundStyle(skin.text)
        #if os(macOS)
          .toolbar { settingsButton }
        #endif
    }
    .environment(\.themeTextColor, skin.theme == nil ? nil : skin.text)
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
        CustomThemeControls(store: themes, selection: $model.skin)
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

struct CustomTheme: Codable, Equatable, Identifiable {
  struct Colors: Codable, Equatable {
    var background: String
    var text: String
    var accent: String
  }
  var format = "nutug-theme"
  var version = 1
  var id = UUID().uuidString
  var name = ""
  var colors = Colors(background: "#FFFFFF", text: "#1D1D1F", accent: "#007AFF")
  func validated() throws -> CustomTheme {
    guard format == "nutug-theme", version == 1,
      id.range(of: "^[a-zA-Z0-9-]{1,64}$", options: .regularExpression) != nil,
      !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, name.utf16.count <= 120,
      [colors.background, colors.text, colors.accent].allSatisfy({
        $0.range(of: "^#[0-9a-fA-F]{6}$", options: .regularExpression) != nil
      })
    else {
      throw CocoaError(.fileReadCorruptFile)
    }
    var result = self
    result.name = name.trimmingCharacters(in: .whitespacesAndNewlines)
    result.colors = Colors(
      background: colors.background.uppercased(), text: colors.text.uppercased(),
      accent: colors.accent.uppercased())
    return result
  }
  static func decode(_ data: Data) throws -> CustomTheme {
    guard data.count <= 65536 else { throw CocoaError(.fileReadTooLarge) }
    return try JSONDecoder().decode(CustomTheme.self, from: data).validated()
  }
  func encoded() throws -> Data {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
    return try encoder.encode(validated())
  }
  var isDark: Bool { Self.isDark(colors.background) }
  static func isDark(_ hex: String) -> Bool {
    let n = UInt32(hex.dropFirst(), radix: 16) ?? 0xFFFFFF
    return
      (Double((n >> 16) & 255) * 0.2126 + Double((n >> 8) & 255) * 0.7152 + Double(n & 255) * 0.0722)
      / 255 < 0.5
  }
}

@MainActor final class CustomThemeStore: ObservableObject {
  @Published private(set) var items: [CustomTheme] = []
  private let defaults: UserDefaults
  init(defaults: UserDefaults = .standard) {
    self.defaults = defaults
    if let data = defaults.data(forKey: "nutug.customThemes"),
      let saved = try? JSONDecoder().decode([CustomTheme].self, from: data)
    {
      items = saved.compactMap { try? $0.validated() }
    }
  }
  func save(_ theme: CustomTheme) throws {
    let value = try theme.validated()
    let next = items.filter { $0.id != value.id } + [value]
    defaults.set(try JSONEncoder().encode(next), forKey: "nutug.customThemes")
    items = next
  }
  func importData(_ data: Data) throws -> CustomTheme {
    var value = try CustomTheme.decode(data)
    value.id = UUID().uuidString
    try save(value)
    return value
  }
  func remove(_ id: String) throws {
    let next = items.filter { $0.id != id }
    defaults.set(try JSONEncoder().encode(next), forKey: "nutug.customThemes")
    items = next
  }
}

extension Color {
  init(themeHex: String) {
    let n = UInt32(themeHex.dropFirst(), radix: 16) ?? 0
    self.init(
      .sRGB, red: Double((n >> 16) & 255) / 255, green: Double((n >> 8) & 255) / 255,
      blue: Double(n & 255) / 255, opacity: 1)
  }
  var themeHex: String {
    #if os(iOS)
      var r: CGFloat = 0
      var g: CGFloat = 0
      var b: CGFloat = 0
      var a: CGFloat = 0
      UIColor(self).getRed(&r, green: &g, blue: &b, alpha: &a)
    #else
      let color = NSColor(self).usingColorSpace(.sRGB) ?? .black
      let r = color.redComponent
      let g = color.greenComponent
      let b = color.blueComponent
    #endif
    return String(
      format: "#%02X%02X%02X", Int(round(r * 255)), Int(round(g * 255)), Int(round(b * 255)))
  }
}

struct ThemeFile: FileDocument {
  static var readableContentTypes: [UTType] { [.json] }
  var data: Data
  init(data: Data) { self.data = data }
  init(configuration: ReadConfiguration) throws {
    data = configuration.file.regularFileContents ?? Data()
  }
  func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
    FileWrapper(regularFileWithContents: data)
  }
}

private struct CustomThemeControls: View {
  @ObservedObject var store: CustomThemeStore
  @Binding var selection: String
  @State private var draft: CustomTheme?
  @State private var importing = false
  @State private var exporting = false
  @State private var exportData = Data()
  @State private var error = false
  @State private var errorLabel = Copy.calendar("importError")
  var body: some View {
    Section {
      ForEach(store.items) { theme in
        HStack(alignment: .top) {
          Button {
            selection = "custom:" + theme.id
          } label: {
            HStack(alignment: .top) {
              RoundedRectangle(cornerRadius: 5).fill(Color(themeHex: theme.colors.background))
                .frame(width: 32, height: 32).overlay(
                  RoundedRectangle(cornerRadius: 5).stroke(Color(themeHex: theme.colors.accent)))
              MongolianLabel(text: theme.name, height: 100)
              if selection == "custom:" + theme.id { Image(systemName: "checkmark") }
            }
          }.buttonStyle(.plain)
          Spacer()
          Button {
            draft = theme
          } label: {
            Image(systemName: "pencil")
          }.accessibilityLabel(Copy.calendar("edit"))
          Button {
            do {
              exportData = try theme.encoded()
              exporting = true
            } catch {
              errorLabel = Copy.calendar("storageError")
              self.error = true
            }
          } label: {
            Image(systemName: "square.and.arrow.up")
          }.accessibilityLabel(Copy.calendar("export"))
          Button {
            do {
              try store.remove(theme.id)
              if selection == "custom:" + theme.id { selection = "light" }
            } catch {
              errorLabel = Copy.calendar("storageError")
              self.error = true
            }
          } label: {
            Image(systemName: "trash")
          }.accessibilityLabel(Copy.calendar("delete"))
        }.buttonStyle(.borderless)
      }
      HStack(alignment: .top, spacing: 24) {
        Button {
          draft = CustomTheme()
        } label: {
          Label {
            MongolianLabel(text: Copy.calendar("add"), height: 76)
          } icon: {
            Image(systemName: "plus")
          }
        }
        Button {
          importing = true
        } label: {
          Label {
            MongolianLabel(text: Copy.calendar("import"), height: 76)
          } icon: {
            Image(systemName: "square.and.arrow.down")
          }
        }
      }.buttonStyle(.plain)
      if error { MongolianLabel(text: errorLabel, height: 160, color: .red) }
    }
    .sheet(item: $draft) { theme in
      ThemeEditor(theme: theme) { value in
        do {
          try store.save(value)
          selection = "custom:" + value.id
          draft = nil
        } catch {
          errorLabel = Copy.calendar("storageError")
          self.error = true
        }
      }
    }
    .fileImporter(isPresented: $importing, allowedContentTypes: [.json]) { result in
      do {
        let url = try result.get()
        let access = url.startAccessingSecurityScopedResource()
        defer { if access { url.stopAccessingSecurityScopedResource() } }
        let size = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
        guard size <= 65536 else { throw CocoaError(.fileReadTooLarge) }
        let theme = try store.importData(Data(contentsOf: url))
        selection = "custom:" + theme.id
        error = false
      } catch {
        if (error as? CocoaError)?.code != .userCancelled {
          errorLabel = Copy.calendar("importError")
          self.error = true
        }
      }
    }
    .fileExporter(
      isPresented: $exporting, document: ThemeFile(data: exportData), contentType: .json,
      defaultFilename: "Nutug-theme"
    ) { result in
      if case .failure(let failure) = result, (failure as? CocoaError)?.code != .userCancelled {
        errorLabel = Copy.calendar("storageError")
        error = true
      }
    }
  }
}

struct ThemeEditor: View {
  @State var theme: CustomTheme
  let onSave: (CustomTheme) -> Void
  @Environment(\.dismiss) private var dismiss
  @State private var invalid = false
  var body: some View {
    NavigationStack {
      Form {
        HStack(alignment: .top) {
          MongolianLabel(text: Copy.calendar("title"), height: 84)
          MongolianTextInput(text: $theme.name, label: Copy.calendar("title")).frame(
            maxWidth: .infinity
          ).frame(height: 108)
        }
        colorRow("themeBackground", value: $theme.colors.background)
        colorRow("themeText", value: $theme.colors.text)
        colorRow("themeAccent", value: $theme.colors.accent)
        HStack(alignment: .top, spacing: 16) {
          Text("15").foregroundStyle(
            CustomTheme.isDark(theme.colors.accent) ? Color.white : Color.black
          ).padding(8).background(Color(themeHex: theme.colors.accent), in: Circle())
          MongolianText(
            text: Copy.calendar("agenda"), height: 108, size: 24,
            color: Color(themeHex: theme.colors.text))
          MongolianText(
            text: Copy.calendar("today"), height: 108, size: 24,
            color: Color(themeHex: theme.colors.text))
        }.padding().frame(maxWidth: .infinity, alignment: .leading).background(
          Color(themeHex: theme.colors.background))
        if invalid { MongolianLabel(text: Copy.calendar("invalid"), height: 160, color: .red) }
      }
      .safeAreaInset(edge: .top) {
        HStack {
          Button {
            dismiss()
          } label: {
            Image(systemName: "xmark")
          }.accessibilityLabel(Copy.label("close"))
          Spacer()
          MongolianLabel(text: Copy.calendar("appearance"), height: 76)
          Spacer()
          Button {
            do { onSave(try theme.validated()) } catch { invalid = true }
          } label: {
            Image(systemName: "checkmark")
          }.accessibilityLabel(Copy.calendar("save"))
        }.padding().background(.regularMaterial)
      }
    }
    #if os(macOS)
      .frame(width: 520, height: 680)
    #endif
  }
  private func colorRow(_ key: String, value: Binding<String>) -> some View {
    ColorPicker(
      selection: Binding(
        get: { Color(themeHex: value.wrappedValue) }, set: { value.wrappedValue = $0.themeHex }),
      supportsOpacity: false
    ) {
      MongolianLabel(text: Copy.calendar(key), height: 96)
    }.accessibilityLabel(Copy.calendar(key))
  }
}
