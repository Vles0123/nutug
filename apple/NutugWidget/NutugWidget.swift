import SwiftUI
import WidgetKit

extension NutugDayEntry: TimelineEntry {}

struct NutugDayProvider: TimelineProvider {
  func placeholder(in context: Context) -> NutugDayEntry { entry(for: Date()) }
  func getSnapshot(in context: Context, completion: @escaping (NutugDayEntry) -> Void) {
    completion(entry(for: Date()))
  }
  func getTimeline(in context: Context, completion: @escaping (Timeline<NutugDayEntry>) -> Void) {
    let now = Date()
    let calendar = CivilCalendar.calendar
    let midnight = calendar.nextDate(
      after: now, matching: DateComponents(hour: 0, minute: 0), matchingPolicy: .nextTime)
    let entries = [entry(for: now)] + (midnight.map { [entry(for: $0)] } ?? [])
    completion(Timeline(entries: entries, policy: .after(midnight ?? now.addingTimeInterval(3600))))
  }
  private func entry(for date: Date) -> NutugDayEntry { .day(date) }
}

struct NutugDayWidgetView: View {
  let entry: NutugDayEntry
  @Environment(\.widgetFamily) private var family
  var body: some View {
    NutugDayContent(
      entry: entry,
      family: family == .systemSmall ? .small : family == .systemLarge ? .large : .medium
    )
    .containerBackground(.fill.tertiary, for: .widget)
  }
}

@main
struct NutugDayWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "cn.nutug.calendar.today", provider: NutugDayProvider()) { entry in
      NutugDayWidgetView(entry: entry)
    }
    .configurationDisplayName(WidgetResources.calendarTitle)
    .description(WidgetResources.almanac?.text("title") ?? "")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}
