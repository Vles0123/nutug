import Foundation

@main
struct ScheduleChecks {
  static func main() throws {
    let root = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
    let engine = try ScheduleEngine(root: root.appendingPathComponent("apple/Resources/public"))
    var event = CalendarAppointment(startDate: "2026-10-08", endDate: "2026-10-08")
    event.title = "ᠬᠤᠷᠠᠯ"
    event.notes = "ᠮᠣᠩᠭᠣᠯ ᠤᠨ\nᠪᠢᠴᠢᠭ"
    event.frequency = "weekly"
    event.until = "2026-10-31"
    event.exceptions = ["2026-10-15"]
    event = try engine.normalize(event)
    let dates = try engine.occurrences([event], from: "2026-10-01", to: "2026-10-31").map(
      \.startDate)
    precondition(dates == ["2026-10-08", "2026-10-22", "2026-10-29"])
    let restored = try engine.importText(engine.export([event]))
    precondition(restored == [event])
    var invalid = event
    invalid.title = ""
    do {
      _ = try engine.normalize(invalid)
      preconditionFailure("Invalid event accepted")
    } catch {}
    let recovered = try engine.normalize(event)
    precondition(recovered == event)
    let scheduled = try engine.occurrences([event], from: "2026-10-08", to: "2026-10-08")
    let layout = try engine.dayLayout(scheduled, date: "2026-10-08")
    precondition(
      layout.timed.count == 1 && layout.timed[0].start == 540 && layout.timed[0].end == 600)
    let late = try engine.slot(date: "2026-10-08", minute: 1410)
    precondition(late.endDate == "2026-10-09" && late.endTime == "00:30")
    let leap = try engine.slot(date: "2028-02-28", minute: 1410)
    precondition(leap.endDate == "2028-02-29")
    print(
      "PASS: native schedule uses shared recurrence, exceptions, ICS and Mongolian text preservation"
    )
  }
}
