import Foundation
import JavaScriptCore

struct LunarDay: Equatable {
  let year: Int
  let month: Int
  let day: Int
  let leap: Bool
}
final class CalendarEngine {
  private let context: JSContext
  private var values: [String: LunarDay] = [:]
  init(root: URL) throws {
    guard let context = JSContext() else { throw CocoaError(.coderInvalidValue) }
    self.context = context
    for name in ["vendor/lunar-1.7.7.js", "chinese-almanac-core.js"] {
      context.evaluateScript(
        try String(contentsOf: root.appendingPathComponent(name), encoding: .utf8))
      if context.exception != nil { throw CocoaError(.coderInvalidValue) }
    }
  }
  func lunar(_ date: String) -> LunarDay? {
    if let value = values[date] { return value }
    guard date >= "1901-01-01", date <= "2100-12-31",
      let result = context.objectForKeyedSubscript("ChineseAlmanac")?.invokeMethod(
        "compute", withArguments: [date]),
      !result.isUndefined, context.exception == nil
    else {
      context.exception = nil
      return nil
    }
    let value = LunarDay(
      year: Int(result.forProperty("lunarYear").toInt32()),
      month: Int(result.forProperty("lunarMonth").toInt32()),
      day: Int(result.forProperty("lunarDay").toInt32()),
      leap: result.forProperty("leapMonth").toBool())
    values[date] = value
    return value
  }
}
enum CivilCalendar {
  static func normalizedInput(_ value: String) -> String {
    let text = String(
      value.precomposedStringWithCompatibilityMapping.unicodeScalars.map { scalar in
        (0x1810...0x1819).contains(scalar.value) ? String(scalar.value - 0x1810) : String(scalar)
      }.joined()
    ).trimmingCharacters(in: .whitespacesAndNewlines)
    guard text.range(of: #"^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$"#, options: .regularExpression) != nil
    else {
      return text
    }
    let parts = text.replacingOccurrences(of: "/", with: "-")
      .replacingOccurrences(of: ".", with: "-").split(separator: "-").compactMap { Int($0) }
    guard parts.count == 3 else { return text }
    return String(format: "%04d-%02d-%02d", parts[0], parts[1], parts[2])
  }
  static var calendar: Calendar {
    var value = Calendar(identifier: .gregorian)
    value.timeZone = TimeZone(identifier: "Asia/Shanghai")!
    value.firstWeekday = 2
    return value
  }
  static func date(_ value: String) -> Date? {
    let parts = value.split(separator: "-").compactMap { Int($0) }
    guard parts.count == 3 else { return nil }
    let components = DateComponents(year: parts[0], month: parts[1], day: parts[2], hour: 12)
    guard let result = calendar.date(from: components), string(result) == value else { return nil }
    return result
  }
  static func string(_ value: Date) -> String {
    let parts = calendar.dateComponents([.year, .month, .day], from: value)
    return String(format: "%04d-%02d-%02d", parts.year!, parts.month!, parts.day!)
  }
  static func today(_ now: Date = Date()) -> String { string(now) }
  static func moving(_ value: String, component: Calendar.Component, amount: Int) -> String? {
    guard let date = date(value),
      let result = calendar.date(byAdding: component, value: amount, to: date)
    else { return nil }
    return string(result)
  }
  static func days(_ month: String, firstWeekday: Int = 0) -> [String] {
    guard let first = date(month + "-01"),
      let range = calendar.range(of: .day, in: .month, for: first)
    else { return [] }
    let offset = (calendar.component(.weekday, from: first) + 5 - firstWeekday + 7) % 7
    let count = ((offset + range.count + 6) / 7) * 7
    return (0..<count).compactMap { moving(month + "-01", component: .day, amount: $0 - offset) }
  }
}

struct CalendarAppointment: Codable, Identifiable, Equatable {
  var id = UUID().uuidString
  var title = ""
  var notes = ""
  var location = ""
  var startDate: String
  var endDate: String
  var startTime = "09:00"
  var endTime = "10:00"
  var allDay = false
  var frequency = "none"
  var interval = 1
  var until = ""
  var color = "blue"
  var exceptions: [String] = []
  var eventId: String?
  var occurrenceDate: String?
  enum CodingKeys: String, CodingKey {
    case id, title, notes, location, startDate, endDate, startTime, endTime, allDay, interval,
      until, color, exceptions, eventId, occurrenceDate
    case frequency = "repeat"
  }
}

struct ScheduleValidationError: Error {
  let field: String
}

final class ScheduleEngine {
  private let context: JSContext
  init(root: URL) throws {
    guard let context = JSContext() else { throw CocoaError(.coderInvalidValue) }
    self.context = context
    context.evaluateScript(
      try String(contentsOf: root.appendingPathComponent("calendar-events.js"), encoding: .utf8))
    guard context.exception == nil else { throw CocoaError(.coderInvalidValue) }
    let makeId: @convention(block) () -> String = { UUID().uuidString }
    context.setObject(makeId, forKeyedSubscript: "calendarUID" as NSString)
    context.evaluateScript(
      "function nativeImport(value) { return NutugSchedule.importCalendar(value, calendarUID); }")
  }
  private func object<T: Encodable>(_ value: T) throws -> Any {
    try JSONSerialization.jsonObject(with: JSONEncoder().encode(value))
  }
  private func decode<T: Decodable>(_ value: JSValue?, as type: T.Type) throws -> T {
    guard let value, !value.isUndefined, context.exception == nil, let object = value.toObject()
    else {
      let field = context.exception?.toString().components(separatedBy: ": ").last ?? ""
      context.exception = nil
      if ["title", "startDate", "endDate", "startTime", "endTime", "repeat", "interval", "until"]
        .contains(field)
      {
        throw ScheduleValidationError(field: field)
      }
      throw CocoaError(.coderInvalidValue)
    }
    return try JSONDecoder().decode(type, from: JSONSerialization.data(withJSONObject: object))
  }
  func normalize(_ event: CalendarAppointment) throws -> CalendarAppointment {
    try decode(
      context.objectForKeyedSubscript("NutugSchedule").invokeMethod(
        "normalizeEvent", withArguments: [try object(event)]), as: CalendarAppointment.self)
  }
  func occurrences(_ events: [CalendarAppointment], from: String, to: String) throws
    -> [CalendarAppointment]
  {
    try decode(
      context.objectForKeyedSubscript("NutugSchedule").invokeMethod(
        "occurrencesBetween", withArguments: [try object(events), from, to]),
      as: [CalendarAppointment].self)
  }
  func export(_ events: [CalendarAppointment]) throws -> String {
    let value = context.objectForKeyedSubscript("NutugSchedule").invokeMethod(
      "exportCalendar", withArguments: [try object(events)])
    guard context.exception == nil, let result = value?.toString() else {
      context.exception = nil
      throw CocoaError(.coderInvalidValue)
    }
    return result
  }
  func importText(_ text: String) throws -> [CalendarAppointment] {
    try decode(
      context.objectForKeyedSubscript("nativeImport").call(withArguments: [text]),
      as: [CalendarAppointment].self)
  }
}
