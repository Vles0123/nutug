import Foundation

@main
struct CalendarChecks {
  struct Example: Decodable {
    let date: String
    let lunarYear: Int
    let lunarMonth: Int
    let lunarDay: Int
  }
  static func main() throws {
    let root = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
    let copyData = try Data(contentsOf: root.appendingPathComponent("public/interface-copy.json"))
    let copy = try JSONSerialization.jsonObject(with: copyData) as! [String: Any]
    let words = copy["orthography"] as! [[String: String]]
    precondition(words.count == 11)
    for word in words {
      let canonical = word["canonical"]!
      let display = word["display"]!
      precondition(MongolianOrthography.display(canonical, registry: words) == display)
      precondition(MongolianOrthography.display(display, registry: words) == display)
      precondition(
        MongolianOrthography.display("\u{200D}" + canonical, registry: words) == "\u{200D}"
          + canonical)
    }
    let engine = try CalendarEngine(root: root.appendingPathComponent("public"))
    let examples = try JSONDecoder().decode(
      [Example].self,
      from: Data(
        contentsOf: root.appendingPathComponent("tests/fixtures/chinese-almanac-cases.json")))
    for example in examples {
      guard let value = engine.lunar(example.date) else {
        fatalError("Missing date: " + example.date)
      }
      precondition(
        value.year == example.lunarYear && value.month == abs(example.lunarMonth)
          && value.day == example.lunarDay && value.leap == (example.lunarMonth < 0))
    }
    precondition(CivilCalendar.date("2000-02-29") != nil)
    precondition(CivilCalendar.date("1900-02-29") == nil)
    precondition(CivilCalendar.moving("2026-01-31", component: .month, amount: 1) == "2026-02-28")
    precondition(CivilCalendar.days("2028-02").filter { $0.hasPrefix("2028-02") }.count == 29)
    precondition(engine.lunar("2026-02-30") == nil)
    precondition(engine.lunar("2101-01-01") == nil)
    print(
      "PASS: native calendar matches all shared reference dates, leap months and date boundaries")
  }
}
