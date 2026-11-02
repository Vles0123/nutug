import CoreText
import SwiftUI

/// Today in vertical Mongolian: Gregorian date, weekday, Chinese lunar date and the day's almanac.
/// Shared by the widget extension and the widget snapshot check (NUTUG_WIDGET_ROOT).
enum WidgetResources {
  static let root: URL = {
    if let path = ProcessInfo.processInfo.environment["NUTUG_WIDGET_ROOT"] {
      return URL(fileURLWithPath: path, isDirectory: true)
    }
    return Bundle.main.resourceURL!.appendingPathComponent("public", isDirectory: true)
  }()
  static let engine = try? CalendarEngine(root: root)
  static let almanac = try? AlmanacCopy(root: root)
  static let interface: [String: Any] = {
    guard let data = try? Data(contentsOf: root.appendingPathComponent("interface-copy.json")),
      let value = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else { return [:] }
    return value
  }()
  static var weekdays: [String] {
    (interface["calendarCopy"] as? [String: Any])?["weekdays"] as? [String] ?? []
  }
  static var calendarTitle: String {
    (interface["labels"] as? [String: String])?["calendar"] ?? ""
  }
  static var registry: [[String: String]] {
    interface["orthography"] as? [[String: String]] ?? []
  }
  static let font: CGFont? = {
    guard
      let provider = CGDataProvider(
        url: root.appendingPathComponent("fonts/OnonSoninSans.ttf") as CFURL)
    else { return nil }
    return CGFont(provider)
  }()
}

struct NutugDayEntry {
  let date: Date
  let civil: String
  let weekday: String
  let almanac: AlmanacDay?
}

extension NutugDayEntry {
  static func day(_ date: Date) -> NutugDayEntry {
    let civil = CivilCalendar.string(date)
    let weekdays = WidgetResources.weekdays
    let index = (CivilCalendar.calendar.component(.weekday, from: date) + 5) % 7
    return NutugDayEntry(
      date: date, civil: civil, weekday: weekdays.indices.contains(index) ? weekdays[index] : "",
      almanac: WidgetResources.engine?.almanac(civil))
  }
}

/// Draws one or more vertical Mongolian columns with CoreText inside a SwiftUI Canvas,
/// because widgets cannot host UIKit or AppKit views.
struct WidgetMongolian: View {
  let text: String
  var size: CGFloat = 15
  var height: CGFloat = 90
  var color: Color = .primary
  @Environment(\.self) private var environment
  private var attributed: NSAttributedString {
    let display = MongolianOrthography.display(text, registry: WidgetResources.registry)
    let font =
      WidgetResources.font.map { CTFontCreateWithGraphicsFont($0, size, nil, nil) }
      ?? CTFontCreateWithName("Onon Sonin Sans" as CFString, size, nil)
    return NSAttributedString(
      string: display,
      attributes: [
        NSAttributedString.Key(kCTFontAttributeName as String): font,
        NSAttributedString.Key(kCTForegroundColorAttributeName as String): color.resolve(
          in: environment
        ).cgColor,
      ])
  }
  private func lines(_ value: NSAttributedString) -> [CTLine] {
    let setter = CTFramesetterCreateWithAttributedString(value)
    let path = CGPath(
      rect: CGRect(x: 0, y: 0, width: max(20, height - 4), height: 10000), transform: nil)
    let frame = CTFramesetterCreateFrame(setter, CFRange(location: 0, length: 0), path, nil)
    return CTFrameGetLines(frame) as! [CTLine]
  }
  var body: some View {
    let value = attributed
    let columns = lines(value)
    let column = size * 1.5
    Canvas { context, canvas in
      context.withCGContext { cg in
        for (index, line) in columns.enumerated() {
          cg.saveGState()
          cg.textMatrix = .identity
          // SwiftUI's canvas is y-down; rotate each shaped line into a top-to-bottom column.
          cg.translateBy(x: CGFloat(index) * column + size * 0.4, y: 2)
          cg.rotate(by: .pi / 2)
          cg.scaleBy(x: 1, y: -1)
          cg.textPosition = .zero
          CTLineDraw(line, cg)
          cg.restoreGState()
        }
      }
    }
    .frame(width: CGFloat(max(1, columns.count)) * column, height: height)
    .accessibilityLabel(Text(verbatim: text))
  }
}

enum NutugWidgetSize { case small, medium, large }

struct NutugDayContent: View {
  let entry: NutugDayEntry
  let family: NutugWidgetSize
  var body: some View {
    let copy = WidgetResources.almanac
    HStack(alignment: .top, spacing: family == .small ? 8 : 12) {
      VStack(alignment: .leading, spacing: 2) {
        Text(String(Int(entry.civil.suffix(2)) ?? 0))
          .font(.system(size: family == .small ? 40 : 46, weight: .semibold, design: .rounded))
          .monospacedDigit().foregroundStyle(.tint)
        Text(entry.civil.prefix(7).replacingOccurrences(of: "-", with: " / "))
          .font(.caption.monospacedDigit()).foregroundStyle(.secondary)
        if let lunar = entry.almanac?.lunar {
          Label(
            "\(lunar.leap ? "* " : "")\(lunar.month) / \(lunar.day)", systemImage: "moon"
          )
          .font(.caption2.monospacedDigit()).foregroundStyle(.secondary)
        }
        Spacer(minLength: 0)
      }
      WidgetMongolian(text: entry.weekday, size: 15, height: family == .small ? 120 : 130)
      if let day = entry.almanac, let copy {
        WidgetMongolian(
          text: copy.ganZhi(day.dayGanZhi), size: 14, height: 120, color: .secondary)
        if family != .small {
          terms(copy.text("yi"), day.yi.map(copy.activity), accent: true)
          terms(copy.text("ji"), day.ji.map(copy.activity), accent: false)
        }
      }
      Spacer(minLength: 0)
    }
  }
  private func terms(_ title: String, _ values: [String], accent: Bool) -> some View {
    let limit = family == .large ? 6 : 2
    return HStack(alignment: .top, spacing: 4) {
      Divider()
      WidgetMongolian(text: title, size: 13, height: 120, color: accent ? .accentColor : .secondary)
      ForEach(Array(values.prefix(limit).enumerated()), id: \.offset) { _, value in
        WidgetMongolian(text: value, size: 14, height: family == .large ? 260 : 120)
      }
    }
  }
}

