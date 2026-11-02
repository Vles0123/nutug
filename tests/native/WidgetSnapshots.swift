import AppKit
import SwiftUI

/// Renders the calendar widget layouts to PNG files so they can be reviewed without a device.
/// Usage: WidgetSnapshots <output directory>  (NUTUG_WIDGET_ROOT points at the native resources)
@main
struct WidgetSnapshots {
  @MainActor static func main() throws {
    let output = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
    try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
    precondition(WidgetResources.engine != nil && WidgetResources.almanac != nil)
    let sizes: [(String, NutugWidgetSize, CGSize)] = [
      ("small", .small, CGSize(width: 170, height: 170)),
      ("medium", .medium, CGSize(width: 364, height: 170)),
      ("large", .large, CGSize(width: 364, height: 382)),
    ]
    let days = ["2026-11-02", "2026-12-22"]
    for day in days {
      let entry = NutugDayEntry.day(CivilCalendar.date(day)!)
      precondition(entry.civil == day && entry.almanac != nil && !entry.weekday.isEmpty)
      for scheme in [ColorScheme.light, .dark] {
        for (name, family, size) in sizes {
          let view = NutugDayContent(entry: entry, family: family)
            .padding(16)
            .frame(width: size.width, height: size.height, alignment: .topLeading)
            .background(scheme == .dark ? Color(white: 0.17) : Color(white: 0.95))
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
            .environment(\.colorScheme, scheme)
            .tint(.blue)
          let renderer = ImageRenderer(content: view)
          renderer.scale = 3
          guard let image = renderer.cgImage else { fatalError("Render failed: \(name)") }
          let rep = NSBitmapImageRep(cgImage: image)
          let file = output.appendingPathComponent(
            "widget-\(day)-\(name)-\(scheme == .dark ? "dark" : "light").png")
          try rep.representation(using: .png, properties: [:])!.write(to: file)
        }
      }
    }
    print("PASS: rendered \(days.count * 2 * sizes.count) widget snapshots to \(output.path)")
  }
}
