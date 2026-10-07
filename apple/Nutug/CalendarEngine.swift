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
  static func days(_ month: String) -> [String] {
    guard let first = date(month + "-01"),
      let range = calendar.range(of: .day, in: .month, for: first)
    else { return [] }
    let offset = (calendar.component(.weekday, from: first) + 5) % 7
    let count = ((offset + range.count + 6) / 7) * 7
    return (0..<count).compactMap { moving(month + "-01", component: .day, amount: $0 - offset) }
  }
}
