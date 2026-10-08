import Combine
import SwiftUI
import UniformTypeIdentifiers

@MainActor
final class AppointmentStore: ObservableObject {
  @Published private(set) var events: [CalendarAppointment] = []
  @Published var error = false
  @Published private(set) var invalidField: String?
  @Published var undoAvailable = false
  private var previous: [CalendarAppointment]?
  private var locked = false
  private let engine = try? ScheduleEngine(root: AppModel.publicRoot)
  private let file: URL
  private static var defaultFile: URL {
    FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("NutugCalendar", isDirectory: true).appendingPathComponent(
        "appointments.json")
  }
  private struct Saved: Codable {
    let version: Int
    let events: [CalendarAppointment]
  }
  init(fileURL: URL? = nil) {
    file = fileURL ?? Self.defaultFile
    guard FileManager.default.fileExists(atPath: file.path) else { return }
    do {
      let saved = try JSONDecoder().decode(Saved.self, from: Data(contentsOf: file))
      guard saved.version == 1, let engine else { throw CocoaError(.coderInvalidValue) }
      events = try saved.events.map(engine.normalize)
      guard Set(events.map(\.id)).count == events.count else {
        events = []
        throw CocoaError(.coderInvalidValue)
      }
    } catch {
      self.error = true
      locked = true
    }
  }
  @discardableResult private func write(_ next: [CalendarAppointment]) -> Bool {
    guard !locked else { return false }
    do {
      try FileManager.default.createDirectory(
        at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
      try JSONEncoder().encode(Saved(version: 1, events: next)).write(to: file, options: .atomic)
      events = next
      error = false
      return true
    } catch {
      self.error = true
      return false
    }
  }
  func occurrences(from: String, to: String) -> [CalendarAppointment] {
    (try? engine?.occurrences(events, from: max("1901-01-01", from), to: min("2100-12-31", to)))
      ?? []
  }
  @discardableResult func save(
    _ event: CalendarAppointment, exception: CalendarAppointment? = nil
  ) -> Bool {
    invalidField = nil
    do {
      guard let engine else { throw CocoaError(.coderInvalidValue) }
      let value = try engine.normalize(event)
      var next = events.filter { $0.id != value.id }
      if let exception {
        let id = exception.eventId ?? exception.id
        guard let index = next.firstIndex(where: { $0.id == id }) else {
          throw CocoaError(.coderInvalidValue)
        }
        next[index].exceptions.append(exception.occurrenceDate ?? exception.startDate)
        next[index] = try engine.normalize(next[index])
      }
      if write(next + [value]) {
        previous = nil
        undoAvailable = false
        return true
      }
    } catch let issue as ScheduleValidationError {
      invalidField = issue.field
      self.error = false
    } catch { self.error = true }
    return false
  }
  func individual(_ occurrence: CalendarAppointment) -> CalendarAppointment {
    var value = occurrence
    value.id = UUID().uuidString
    value.frequency = "none"
    value.until = ""
    value.interval = 1
    value.exceptions = []
    value.eventId = nil
    value.occurrenceDate = nil
    return value
  }
  func remove(_ occurrence: CalendarAppointment, onlyThis: Bool) {
    let old = events
    let id = occurrence.eventId ?? occurrence.id
    let next =
      onlyThis
      ? events.map { value -> CalendarAppointment in
        var result = value
        if value.id == id {
          result.exceptions.append(occurrence.occurrenceDate ?? occurrence.startDate)
        }
        return result
      } : events.filter { $0.id != id }
    if write(next) {
      previous = old
      undoAvailable = true
    }
  }
  func undo() {
    if let previous, write(previous) {
      self.previous = nil
      undoAvailable = false
    }
  }
  func exportText() -> String { (try? engine?.export(events)) ?? "" }
  func importText(_ text: String) {
    do {
      guard let engine else { throw CocoaError(.coderInvalidValue) }
      let incoming = try engine.importText(text)
      var merged = Dictionary(uniqueKeysWithValues: events.map { ($0.id, $0) })
      for event in incoming { merged[event.id] = event }
      if write(Array(merged.values)) {
        previous = nil
        undoAvailable = false
      }
    } catch { self.error = true }
  }
}

struct CalendarFile: FileDocument {
  static var readableContentTypes: [UTType] { [UTType(filenameExtension: "ics") ?? .plainText] }
  var text: String
  init(text: String) { self.text = text }
  init(configuration: ReadConfiguration) throws {
    text = String(data: configuration.file.regularFileContents ?? Data(), encoding: .utf8) ?? ""
  }
  func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
    FileWrapper(regularFileWithContents: Data(text.utf8))
  }
}

struct CalendarTransferControls: View {
  @ObservedObject var store: AppointmentStore
  @State private var importing = false
  @State private var exporting = false
  var body: some View {
    HStack(alignment: .top, spacing: 24) {
      Button {
        importing = true
      } label: {
        HStack(alignment: .top) {
          Image(systemName: "square.and.arrow.down")
          MongolianText(text: Copy.calendar("import"), height: 110, size: 23)
        }
      }
      Button {
        exporting = true
      } label: {
        HStack(alignment: .top) {
          Image(systemName: "square.and.arrow.up")
          MongolianText(text: Copy.calendar("export"), height: 110, size: 23)
        }
      }
    }.buttonStyle(.bordered)
      .fileImporter(isPresented: $importing, allowedContentTypes: CalendarFile.readableContentTypes)
    { result in
      do {
        let url = try result.get()
        let access = url.startAccessingSecurityScopedResource()
        defer { if access { url.stopAccessingSecurityScopedResource() } }
        store.importText(try String(contentsOf: url, encoding: .utf8))
      } catch { store.error = true }
    }
      .fileExporter(
        isPresented: $exporting, document: CalendarFile(text: store.exportText()),
        contentType: CalendarFile.readableContentTypes[0], defaultFilename: "Nutug"
      ) { result in
        if case .failure = result { store.error = true }
      }
  }
}

enum CalendarSkin: String, CaseIterable, Identifiable {
  case light, dark, paper, ink
  var id: String { rawValue }
  var accent: Color {
    switch self {
    case .light: return .blue
    case .dark: return Color(red: 0.48, green: 0.73, blue: 1)
    case .paper: return Color(red: 0.51, green: 0.38, blue: 0.24)
    case .ink: return .black
    }
  }
  var canvas: Color {
    switch self {
    case .light, .ink: return .white
    case .dark: return Color(red: 0.11, green: 0.13, blue: 0.16)
    case .paper: return Color(red: 1, green: 0.99, blue: 0.95)
    }
  }
  var scheme: ColorScheme { self == .dark ? .dark : .light }
}

struct NativeAgenda: View {
  let items: [CalendarAppointment]
  let onOpen: (CalendarAppointment) -> Void
  let onAdd: () -> Void
  var body: some View {
    ScrollView(.horizontal) {
      HStack(alignment: .top, spacing: 16) {
        if items.isEmpty {
          MongolianText(text: Copy.calendar("empty"), height: 110, size: 24).foregroundStyle(
            .secondary)
        }
        ForEach(items) { item in
          Button {
            onOpen(item)
          } label: {
            HStack(alignment: .top, spacing: 12) {
              if item.allDay {
                MongolianText(text: Copy.calendar("allDay"), height: 120, size: 21)
              } else {
                VStack(spacing: 8) {
                  Text(item.startTime)
                  Text(item.endTime).foregroundStyle(.secondary)
                }.font(.callout.monospacedDigit())
              }
              MongolianText(text: item.title, height: 130, size: 25)
              if item.frequency != "none" { Image(systemName: "repeat") }
            }.padding(.horizontal, 10).padding(.vertical, 8)
              .overlay(alignment: .leading) { Rectangle().fill(Color.accentColor).frame(width: 2) }
          }.buttonStyle(.plain)
        }
        Button(action: onAdd) {
          HStack(alignment: .top) {
            Image(systemName: "plus")
            MongolianText(text: Copy.calendar("add"), height: 76, size: 24)
          }
        }.buttonStyle(.plain)
      }.padding(.vertical, 8)
    }
  }
}

struct AppointmentEditor: View {
  @State var draft: CalendarAppointment
  @ObservedObject var store: AppointmentStore
  var exception: CalendarAppointment? = nil
  var onSaved: ((CalendarAppointment) -> Void)? = nil
  @Environment(\.dismiss) private var dismiss
  @State private var invalid = false
  @State private var validationAttempt = 0
  @FocusState private var focusedField: String?
  var body: some View {
    NavigationStack {
      Form {
        Section { textField("title", value: $draft.title) }
        Section {
          Toggle(isOn: $draft.allDay) {
            MongolianText(text: Copy.calendar("allDay"), height: 60, size: 23)
          }.toggleStyle(.switch)
            .onChange(of: draft.allDay) { _, value in
              if !value && draft.startTime == draft.endTime {
                draft.startTime = "09:00"
                draft.endTime = "10:00"
              }
            }
          dateFields("start", date: $draft.startDate, time: $draft.startTime)
          dateFields("end", date: $draft.endDate, time: $draft.endTime)
        }
        Section {
          HStack(alignment: .top, spacing: 12) {
            MongolianText(text: Copy.calendar("repeat"), height: 70, size: 23)
            ScrollView(.horizontal) {
              HStack(spacing: 8) {
                ForEach(["none", "daily", "weekly", "monthly", "yearly"], id: \.self) { value in
                  Button {
                    draft.frequency = value
                  } label: {
                    MongolianText(text: Copy.calendar(repeatLabel(value)), height: 65, size: 22)
                  }.buttonStyle(.bordered)
                    .tint(draft.frequency == value ? Color.accentColor : .secondary)
                    .accessibilityAddTraits(draft.frequency == value ? .isSelected : [])
                }
              }
            }
          }
          if draft.frequency != "none" {
            Stepper(value: $draft.interval, in: 1...99) {
              HStack {
                MongolianText(text: Copy.calendar("interval"), height: 70, size: 23)
                Spacer()
                Text(String(draft.interval)).monospacedDigit()
              }
            }
            HStack(alignment: .top) {
              MongolianText(text: Copy.calendar("until"), height: 70, size: 23)
              TextField(draft.startDate, text: $draft.until).monospacedDigit()
                .accessibilityLabel(Copy.calendar("until"))
                .focused($focusedField, equals: "until")
            }
          }
        }
        Section {
          textField("location", value: $draft.location)
          textField("notes", value: $draft.notes)
        }
        if invalid || store.error {
          Section {
            MongolianText(
              text: store.error ? Copy.calendar("storageError") : validationLabel,
              height: 100, size: 23, color: .red)
          }
        }
      }
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button {
            dismiss()
          } label: {
            Image(systemName: "xmark")
          }
          .accessibilityLabel(Copy.label("close"))
        }
        ToolbarItem(placement: .confirmationAction) {
          Button {
            if store.save(draft, exception: exception) {
              if let saved = store.events.first(where: { $0.id == draft.id }) { onSaved?(saved) }
              dismiss()
            } else {
              invalid = true
              validationAttempt += 1
              focusedField = store.invalidField
            }
          } label: {
            Image(systemName: "checkmark")
          }
          .buttonStyle(.borderedProminent)
          .accessibilityLabel(Copy.calendar("save"))
        }
      }
    }
    #if os(macOS)
      .frame(width: 620, height: 680)
    #endif
  }
  private func repeatLabel(_ value: String) -> String {
    ["none": "once", "daily": "day", "weekly": "week", "monthly": "month", "yearly": "year"][value]
      ?? "once"
  }
  private var validationLabel: String {
    let field = store.invalidField ?? "invalid"
    if field.hasSuffix("Date") || field.hasSuffix("Time") {
      return Copy.calendar(field.hasPrefix("start") ? "start" : "end") + " · "
        + Copy.calendar(field.hasSuffix("Date") ? "day" : "time")
    }
    return Copy.calendar(field)
  }
  private func textField(_ key: String, value: Binding<String>) -> some View {
    HStack(alignment: .top, spacing: 12) {
      MongolianText(text: Copy.calendar(key), height: 100, size: 23)
      MongolianTextInput(
        text: value, label: Copy.calendar(key),
        focusRequest: store.invalidField == key ? validationAttempt : 0
      )
      .frame(maxWidth: .infinity)
      .frame(height: key == "notes" ? 160 : 130)
    }
  }
  private func dateFields(_ key: String, date: Binding<String>, time: Binding<String>) -> some View
  {
    HStack(alignment: .top, spacing: 10) {
      MongolianText(text: Copy.calendar(key), height: 70, size: 23)
      VStack(spacing: 10) {
        TextField("", text: date).accessibilityLabel(
          Copy.calendar(key) + " · " + Copy.calendar("day")
        )
        .focused($focusedField, equals: key + "Date")
        if !draft.allDay {
          TextField("", text: time).accessibilityLabel(
            Copy.calendar(key) + " · " + Copy.calendar("time")
          )
          .focused($focusedField, equals: key + "Time")
        }
      }.textFieldStyle(.roundedBorder).monospacedDigit().frame(minWidth: 90)
    }
  }
}
