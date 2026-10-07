import Combine
import Foundation
import Network
import SwiftUI

enum NutugPage: String, CaseIterable, Identifiable {
  case calendar, chronicle
  var id: String { rawValue }
  var title: String { Copy.label(rawValue) }
  var symbol: String { self == .calendar ? "calendar" : "book" }
}
enum Copy {
  static func display(_ text: String) -> String {
    MongolianOrthography.display(text, registry: values["orthography"] as? [[String: String]] ?? [])
  }
  private static let values: [String: Any] = {
    guard
      let data = try? Data(
        contentsOf: AppModel.publicRoot.appendingPathComponent("interface-copy.json")),
      let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else { return [:] }
    return object
  }()
  static func label(_ key: String) -> String { (values["labels"] as? [String: String])?[key] ?? "" }
  static func calendar(_ key: String) -> String {
    (values["calendarCopy"] as? [String: Any])?[key] as? String ?? ""
  }
  static var weekdays: [String] {
    (values["calendarCopy"] as? [String: Any])?["weekdays"] as? [String] ?? []
  }
}

struct NutugSource: Codable, Identifiable {
  var title: String?
  var name: String?
  var label: String?
  var url: String
  var id: String { url }
  var displayTitle: String { title ?? name ?? label ?? "" }
}
struct HistoryPerson: Codable {
  var name: String
  var summary: String
  var years: String?
  var sources: [String]
}
struct HistoryEdge: Codable, Identifiable {
  var from: String
  var to: String
  var type: String
  var label: String
  var id: String { "\(type):\(from):\(to)" }
}
struct HistoryEvent: Codable, Identifiable {
  var id: String
  var date: String
  var title: String
  var text: String
  var people: [String]
  var sources: [String]
  var startYear: Int?
  var endYear: Int?
  var precision: String?
}
struct HistoryCore: Codable {
  var people: [String: HistoryPerson]
  var peopleEdges: [HistoryEdge]
  var events: [HistoryEvent]
  var sources: [String: NutugSource]
}
struct ContentManifest: Decodable {
  let schemaVersion: Int
  let version: String
  let core: String
}
private struct SavedHistory: Codable {
  let version: String
  let content: Data
}

@MainActor
final class HistoryStore: ObservableObject {
  @Published var content: HistoryCore?
  @Published var loading = false
  @Published var failed = false
  @Published var version = ""
  @Published var updateAvailable = false
  private var pending: HistoryCore?
  private let connection = NWPathMonitor()
  init() {
    connection.pathUpdateHandler = { [weak self] path in
      guard path.status == .satisfied else { return }
      Task { @MainActor in
        guard let self, self.restored else { return }
        await self.load()
      }
    }
    connection.start(queue: DispatchQueue(label: "nutug.content.connection"))
  }
  deinit { connection.cancel() }
  func refresh() async {
    if let pending {
      content = pending
      self.pending = nil
      updateAvailable = false
    } else {
      await load()
    }
  }
  private let manifestURL = URL(
    string:
      "https://raw.githubusercontent.com/Vles0123/nutug/refs/heads/chore/content-feed/manifest.json"
  )!
  private var file: URL {
    FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("Nutug", isDirectory: true).appendingPathComponent("history.json")
  }
  private var restored = false
  func load() async {
    guard !loading else { return }
    loading = true
    failed = false
    defer { loading = false }
    if !restored {
      restored = true
      if let bytes = try? Data(contentsOf: file),
        let saved = try? JSONDecoder().decode(SavedHistory.self, from: bytes),
        let core = try? JSONDecoder().decode(HistoryCore.self, from: saved.content)
      {
        content = core
        version = saved.version
      }
    }
    do {
      let manifest = try JSONDecoder().decode(ContentManifest.self, from: await fetch(manifestURL))
      guard manifest.schemaVersion == 2 else { throw URLError(.cannotParseResponse) }
      if manifest.version == version { return }
      guard manifest.core.hasPrefix("releases/\(manifest.version)/"), !manifest.core.contains(".."),
        let url = URL(string: manifest.core, relativeTo: manifestURL)?.absoluteURL,
        url.host == manifestURL.host
      else { throw URLError(.badURL) }
      let bytes = try await fetch(url)
      let core = try JSONDecoder().decode(HistoryCore.self, from: bytes)
      guard !core.events.isEmpty, Set(core.events.map(\.id)).count == core.events.count,
        core.events.allSatisfy({ event in
          event.people.allSatisfy { core.people[$0] != nil }
            && event.sources.allSatisfy { core.sources[$0] != nil }
        })
      else { throw URLError(.cannotParseResponse) }
      try FileManager.default.createDirectory(
        at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
      try JSONEncoder().encode(SavedHistory(version: manifest.version, content: bytes)).write(
        to: file, options: .atomic)
      version = manifest.version
      if content == nil {
        content = core
      } else {
        pending = core
        updateAvailable = true
      }
    } catch { failed = true }
  }
  private func fetch(_ url: URL) async throws -> Data {
    var request = URLRequest(
      url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 20)
    request.httpMethod = "GET"
    let (data, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
      throw URLError(.badServerResponse)
    }
    return data
  }
}

@MainActor
final class AppModel: ObservableObject {
  @Published var page: NutugPage = .calendar
  @Published var settingsPresented = false
  @Published var readingScale: Double {
    didSet { UserDefaults.standard.set(readingScale, forKey: "nutug.readingScale") }
  }
  let history = HistoryStore()
  let calendar = CalendarModel()
  nonisolated static var publicRoot: URL {
    Bundle.main.resourceURL!.appendingPathComponent("public", isDirectory: true)
  }
  init() {
    let saved = UserDefaults.standard.double(forKey: "nutug.readingScale")
    readingScale = saved > 0 ? min(1.5, max(0.85, saved)) : 1
  }
}
