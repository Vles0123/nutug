import SwiftUI
import UIKit
import WebKit

@main
struct RenderingChecksApp: App {
  init() { MongolianText.registerFont() }
  var body: some Scene {
    WindowGroup { RenderingChecksView() }
  }
}

private struct RenderingChecksView: View {
  @StateObject private var run = RenderingChecksRun()
  var body: some View {
    ZStack {
      if run.screen == "theme-editor", let theme = run.app.themes.items.first {
        ThemeEditor(theme: theme) { _ in }
      } else if run.screen == "editor" {
        AppointmentEditor(draft: run.fixture, store: run.calendar.appointments)
      } else if run.screen == "history" {
        NativeHistory(store: run.history, scale: 1)
      } else if run.screen == "person", let core = run.history.content, let id = run.personID {
        NativePerson(id: id, core: core, scale: 1)
      } else {
        RootView(model: run.app)
      }
    }
    .environment(\.locale, Locale(identifier: "mn_Mong_CN"))
    .dynamicTypeSize(run.largeText ? .accessibility1 : .large)
    .preferredColorScheme(run.palette.scheme)
    .tint(run.palette.accent)
    .task { await run.perform() }
  }
}

@MainActor
private final class RenderingChecksRun: ObservableObject {
  @Published var screen = "calendar"
  @Published var largeText = false
  @Published var palette = CalendarSkin.light
  var personID: String?
  let app = AppModel()
  let calendar: CalendarModel
  let history = HistoryStore(networkEnabled: false)
  var fixture: CalendarAppointment
  private var started = false
  private let directory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    .appendingPathComponent("render-checks", isDirectory: true)

  init() {
    let file = FileManager.default.temporaryDirectory.appendingPathComponent(
      "render-appointments.json")
    try? FileManager.default.removeItem(at: file)
    calendar = CalendarModel(appointments: AppointmentStore(fileURL: file))
    fixture = CalendarAppointment(startDate: "2026-10-08", endDate: "2026-10-08")
    fixture.title = "ᠬᠤᠷᠠᠯ"
    fixture.notes = "ᠮᠣᠩᠭᠣᠯ ᠤᠨ ᠪᠢᠴᠢᠭ"
    fixture.location = "ᠬᠥᠬᠡ ᠬᠣᠲᠠ"
    fixture.frequency = "weekly"
    fixture.until = "2026-10-31"
    app.calendar = calendar
    calendar.select("2026-10-08")
    calendar.view = "month"
  }

  private func require(_ value: Bool, _ message: String) throws {
    if !value {
      throw NSError(
        domain: "NutugRenderingChecks", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
    }
  }

  func perform() async {
    guard !started else { return }
    started = true
    var screenshots: [[String: Any]] = []
    do {
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
      let importedTheme = try app.themes.importData(
        Data(
          contentsOf: directory.deletingLastPathComponent().appendingPathComponent(
            "theme-fixture.json")))
      try require(importedTheme.colors.background == "#F3EAD8", "Import web theme")
      try require(CustomThemeStore().items.contains(importedTheme), "Theme survives reload")
      try importedTheme.encoded().write(to: directory.appendingPathComponent("theme-export.json"))
      let count = app.themes.items.count
      var rejectedTheme = false
      do { _ = try app.themes.importData(Data("{}".utf8)) } catch { rejectedTheme = true }
      try require(rejectedTheme, "Reject invalid theme")
      try require(app.themes.items.count == count, "Invalid import preserves themes")
      var changedTheme = importedTheme
      changedTheme.name = "ᠬᠥᠬᠡ"
      changedTheme.colors = CustomTheme.Colors(
        background: "#18222F", text: "#E3EDFA", accent: "#91B7EE")
      try app.themes.save(changedTheme)
      try require(
        app.themes.items.count == count && CustomThemeStore().items.contains(changedTheme),
        "Edit and persist theme")
      try require(
        CalendarSkin(theme: changedTheme).scheme == .dark, "Dark palette selects dark controls")
      try app.themes.save(importedTheme)
      let duplicateTheme = try app.themes.importData(importedTheme.encoded())
      try require(
        duplicateTheme.id != importedTheme.id && app.themes.items.count == count + 1,
        "Import preserves existing theme")
      try app.themes.remove(duplicateTheme.id)
      try require(CustomThemeStore().items.count == count, "Delete persists")
      let store = calendar.appointments
      try require(
        Copy.weekdays.count == 7 && Copy.weekdays[6] == "ᠭᠠᠷᠠᠭ ᠤᠨ ᠡᠳᠦᠷ",
        "Modern weekday names are bundled")
      try require(calendar.firstWeekday == 6, "New calendars start on Sunday")
      var invalid = fixture
      invalid.title = ""
      try require(
        !store.save(invalid) && store.invalidField == "title",
        "Validation identifies the title field")
      try require(store.save(fixture), "Create appointment")
      try require(store.invalidField == nil, "Valid save clears the field error")
      let occurrences = store.occurrences(from: "2026-10-01", to: "2026-10-31")
      try require(occurrences.count == 4, "Weekly recurrence")
      var edited = store.individual(occurrences[1])
      edited.title = "ᠪᠢᠴᠢᠭ"
      try require(store.save(edited, exception: occurrences[1]), "Edit one occurrence")
      try require(
        store.occurrences(from: "2026-10-15", to: "2026-10-15").first?.title == edited.title,
        "Occurrence replacement")
      let savedFile = FileManager.default.temporaryDirectory.appendingPathComponent(
        "render-appointments.json")
      let reopened = AppointmentStore(fileURL: savedFile)
      try require(reopened.events.count == 2, "Reload saved data")
      reopened.remove(edited, onlyThis: false)
      reopened.undo()
      try require(reopened.events.count == 2, "Delete and undo")
      let importedFile = FileManager.default.temporaryDirectory.appendingPathComponent(
        "render-import.json")
      try? FileManager.default.removeItem(at: importedFile)
      let imported = AppointmentStore(fileURL: importedFile)
      imported.importText(reopened.exportText())
      try require(imported.events.count == 2, "Calendar file round trip")

      var overlap = CalendarAppointment(
        startDate: "2026-10-08", endDate: "2026-10-08", startTime: "09:30", endTime: "11:00")
      overlap.title = "ᠮᠣᠩᠭᠣᠯ ᠤᠨ ᠪᠢᠴᠢᠭ"
      overlap.color = "green"
      try require(store.save(overlap), "Concurrent event fixture")
      var afternoon = CalendarAppointment(
        startDate: "2026-10-08", endDate: "2026-10-08", startTime: "13:00", endTime: "14:30")
      afternoon.title = "ᠪᠢᠴᠢᠭ"
      afternoon.color = "orange"
      try require(store.save(afternoon), "Afternoon fixture")
      var allDay = CalendarAppointment(startDate: "2026-10-08", endDate: "2026-10-10", allDay: true)
      allDay.title = "ᠮᠣᠩᠭᠣᠯ ᠪᠢᠴᠢᠭ"
      allDay.color = "purple"
      try require(store.save(allDay), "All-day fixture")
      let timeline = store.timeline("2026-10-08")
      try require(
        timeline.allDay.count == 1 && timeline.timed.count == 3, "All-day and timed separation")
      try require(
        timeline.timed[0].columns == 2 && timeline.timed[1].columns == 2, "Concurrent event columns"
      )
      let slot = store.draft(date: "2026-10-08", minute: 1410)
      try require(
        slot?.startTime == "23:30" && slot?.endDate == "2026-10-09" && slot?.endTime == "00:30",
        "Slot seeds editor across midnight")

      calendar.showLunar = false
      try require(calendar.selectInput("᠒᠐᠒᠘/᠒/᠒᠙"), "Gregorian leap-day jump")
      try require(
        calendar.date == "2028-02-29"
          && calendar.days.filter { $0.hasPrefix("2028-02") }.count == 29, "Gregorian leap month")
      try require(
        !calendar.selectInput("2100-02-29") && calendar.date == "2028-02-29",
        "Invalid Gregorian date preserves selection")
      screenshots.append(try await capture("gregorian-month"))
      calendar.view = "day"
      screenshots.append(try await capture("gregorian-day"))
      calendar.view = "month"
      calendar.showLunar = true
      calendar.select("2026-10-08")

      for skin in CalendarSkin.allCases {
        app.skin = skin.rawValue
        palette = skin
        screenshots.append(try await capture("month-" + skin.rawValue))
      }
      app.skin = "custom:" + importedTheme.id
      palette = CalendarSkin(theme: importedTheme)
      screenshots.append(try await capture("custom-theme"))
      try app.themes.save(changedTheme)
      palette = CalendarSkin(theme: changedTheme)
      screenshots.append(try await capture("custom-theme-dark"))
      try app.themes.save(importedTheme)
      palette = CalendarSkin(theme: importedTheme)
      app.settingsPresented = true
      screenshots.append(try await capture("custom-theme-settings"))
      app.settingsPresented = false
      screen = "theme-editor"
      screenshots.append(try await capture("theme-editor"))
      screen = "calendar"
      app.skin = "light"
      palette = .light
      for view in ["year", "week", "day"] {
        calendar.view = view
        screenshots.append(try await capture(view))
      }
      app.readingScale = 1.5
      screenshots.append(try await capture("reading-scale"))
      app.readingScale = 1
      calendar.view = "month"
      largeText = true
      screenshots.append(try await capture("large-type"))
      largeText = false
      app.settingsPresented = true
      screenshots.append(try await capture("settings"))
      app.settingsPresented = false
      screen = "editor"
      screenshots.append(try await capture("editor"))
      app.skin = "dark"
      palette = .dark
      screenshots.append(try await capture("editor-dark"))
      app.skin = "light"
      palette = .light
      let coreFile = directory.deletingLastPathComponent().appendingPathComponent(
        "history-fixture.json")
      history.content = try JSONDecoder().decode(HistoryCore.self, from: Data(contentsOf: coreFile))
      try require(history.content?.events.count ?? 0 >= 81, "History fixture is complete")
      screen = "history"
      screenshots.append(try await capture("history"))
      personID = history.content?.people.keys.sorted().max {
        (history.content?.people[$0]?.name.count ?? 0)
          < (history.content?.people[$1]?.name.count ?? 0)
      }
      screen = "person"
      screenshots.append(try await capture("person"))
      largeText = true
      screenshots.append(try await capture("person-large-type"))
      try write([
        "success": true,
        "model": ProcessInfo.processInfo.environment["SIMULATOR_MODEL_IDENTIFIER"]
          ?? UIDevice.current.model,
        "checks": [
          "validation-field", "create", "recurrence", "edit-occurrence", "persistence",
          "delete-undo", "ics-roundtrip", "vertical-input",
          "gregorian-display", "gregorian-date-jump", "gregorian-validation",
          "timeline-all-day", "timeline-overlap", "timeline-slot", "modern-weekdays",
          "sunday-start", "custom-theme-roundtrip",
        ],
        "screenshots": screenshots,
      ])
    } catch {
      try? write([
        "success": false, "error": error.localizedDescription, "screenshots": screenshots,
      ])
    }
  }

  private func capture(_ name: String) async throws -> [String: Any] {
    try await Task.sleep(for: .milliseconds(850))
    guard
      let window = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene })
        .flatMap(\.windows).first(where: \.isKeyWindow)
    else {
      throw NSError(
        domain: "NutugRenderingChecks", code: 2,
        userInfo: [NSLocalizedDescriptionKey: "No application render window"])
    }
    window.layoutIfNeeded()
    if name.hasPrefix("editor") || name == "theme-editor" {
      let expected = name == "theme-editor" ? app.themes.items.first!.name : fixture.title
      func inputs(_ view: UIView) -> [WKWebView] {
        (view as? WKWebView).map { [$0] } ?? view.subviews.flatMap(inputs)
      }
      let fields = inputs(window)
      try require(!fields.isEmpty, "Native Mongolian input is mounted")
      guard let input = fields.first else { throw CocoaError(.coderInvalidValue) }
      try require(input.bounds.width >= 150, "Native Mongolian input has readable width")
      var value = ""
      for _ in 0..<20 {
        value =
          (try? await input.evaluateJavaScript("document.getElementById('input')?.value"))
          as? String ?? ""
        if value == expected { break }
        try await Task.sleep(for: .milliseconds(500))
      }
      try require(value == expected, "Native Mongolian editor restores its field value")
      if let snapshot = try? await input.takeSnapshot(configuration: nil),
        let bytes = snapshot.pngData()
      {
        try bytes.write(to: directory.appendingPathComponent("editor-input.png"), options: .atomic)
      }
    }
    let renderer = UIGraphicsImageRenderer(bounds: window.bounds)
    let bytes = renderer.pngData { _ in
      window.drawHierarchy(in: window.bounds, afterScreenUpdates: true)
    }
    try bytes.write(to: directory.appendingPathComponent(name + ".png"), options: .atomic)
    return [
      "file": name + ".png", "width": window.bounds.width, "height": window.bounds.height,
      "safeAreaInsets": [
        "top": window.safeAreaInsets.top, "left": window.safeAreaInsets.left,
        "bottom": window.safeAreaInsets.bottom, "right": window.safeAreaInsets.right,
      ],
      "rootFrame": [
        "width": window.rootViewController?.view.bounds.width ?? 0,
        "height": window.rootViewController?.view.bounds.height ?? 0,
      ],
      "bytes": bytes.count,
    ]
  }

  private func write(_ result: [String: Any]) throws {
    let data = try JSONSerialization.data(
      withJSONObject: result, options: [.prettyPrinted, .sortedKeys])
    try data.write(to: directory.appendingPathComponent("result.json"), options: .atomic)
  }
}
