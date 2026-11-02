import SwiftUI

/// Chinese almanac (黄历) for the selected day: a compact summary and a full sheet.
enum AlmanacText {
  static let copy = try? AlmanacCopy(root: AppModel.publicRoot)
}

struct AlmanacSummary: View {
  let day: AlmanacDay
  var onOpen: () -> Void
  private let limit = 3
  var body: some View {
    if let copy = AlmanacText.copy {
      Button(action: onOpen) {
        ScrollView(.horizontal, showsIndicators: false) {
          HStack(alignment: .top, spacing: 14) {
            HStack(alignment: .top, spacing: 6) {
              MongolianLabel(text: copy.text("title"), height: 130, size: 17, color: .secondary)
              MongolianLabel(text: copy.ganZhi(day.dayGanZhi), height: 130, size: 18)
              if let term = day.solarTerm {
                MongolianLabel(text: copy.solarTerm(term), height: 130, size: 18)
              }
            }
            group(copy.text("yi"), day.yi, copy: copy, accent: true)
            group(copy.text("ji"), day.ji, copy: copy, accent: false)
            Image(systemName: "chevron.right").foregroundStyle(.secondary)
          }.padding(12)
        }
        .background(.quaternary.opacity(0.5), in: RoundedRectangle(cornerRadius: 14))
      }
      .buttonStyle(.plain)
      .accessibilityLabel(copy.text("title") + " · " + day.date)
      .accessibilityIdentifier("open-almanac")
    }
  }
  private func group(_ label: String, _ terms: [String], copy: AlmanacCopy, accent: Bool)
    -> some View
  {
    HStack(alignment: .top, spacing: 6) {
      Divider().frame(height: 120)
      MongolianLabel(
        text: label, height: 130, size: 17, color: accent ? .accentColor : .secondary)
      ForEach(Array(terms.prefix(limit).enumerated()), id: \.offset) { _, term in
        MongolianLabel(text: copy.activity(term), height: 130, size: 18)
      }
      if terms.count > limit {
        Text("+\(terms.count - limit)").font(.caption.monospacedDigit()).foregroundStyle(
          .secondary)
      }
    }
  }
}

struct AlmanacSheet: View {
  @ObservedObject var model: CalendarModel
  var scale: Double = 1
  var onClose: () -> Void
  var body: some View {
    let copy = AlmanacText.copy
    let day = model.engine?.almanac(model.date)
    ScrollView {
      VStack(alignment: .leading, spacing: 20) {
        HStack(alignment: .center, spacing: 12) {
          if let copy { MongolianText(text: copy.text("title"), height: 160, size: 30) }
          Spacer()
          Button {
            step(-1)
          } label: {
            Image(systemName: "chevron.left")
          }.disabled(target(-1) == nil).accessibilityLabel(copy?.text("previous") ?? "")
          Text(model.date).monospacedDigit()
          Button {
            step(1)
          } label: {
            Image(systemName: "chevron.right")
          }.disabled(target(1) == nil).accessibilityLabel(copy?.text("next") ?? "")
          Button(action: onClose) {
            Image(systemName: "xmark")
          }.accessibilityLabel(Copy.label("close"))
        }.buttonStyle(.bordered)
        if let copy, let day {
          detail(day, copy: copy)
        }
      }.padding(20)
    }
    #if os(macOS)
      .frame(width: 760, height: 680)
    #endif
  }
  private func target(_ amount: Int) -> String? {
    guard let value = CivilCalendar.moving(model.date, component: .day, amount: amount),
      value >= "1901-01-01", value <= "2100-12-31"
    else { return nil }
    return value
  }
  private func step(_ amount: Int) {
    if let value = target(amount) { model.select(value) }
  }
  @ViewBuilder private func detail(_ day: AlmanacDay, copy: AlmanacCopy) -> some View {
    let lunar =
      "\(day.lunar.year) / \(day.lunar.leap ? copy.text("leapMonth") + " " : "")\(day.lunar.month) / \(day.lunar.day)"
    let fields: [(String, String)] = [
      (copy.text("lunarDate"), lunar),
      (copy.text("yearGanZhi"), copy.ganZhi(day.yearGanZhi)),
      (copy.text("monthGanZhi"), copy.ganZhi(day.monthGanZhi)),
      (copy.text("dayGanZhi"), copy.ganZhi(day.dayGanZhi)),
      (copy.text("zodiac"), copy.animal(day.zodiac)),
      (copy.text("solarTerm"), copy.solarTerm(day.solarTerm)),
    ]
    cards(fields)
    terms(copy.text("favorable"), day.yi.map(copy.activity))
    terms(copy.text("unfavorable"), day.ji.map(copy.activity))
    Divider()
    MongolianText(text: Copy.label("directions"), height: 110, size: 22)
    cards(day.directions.map { (copy.text($0.key), copy.direction($0.value)) })
    Divider()
    ScrollView(.horizontal) {
      HStack(alignment: .top, spacing: 18) {
        MongolianText(text: copy.text("source"), height: 160, size: 22)
        ForEach(
          ["algorithmNote", "traditionNote", "directionNote", "ganZhiNote", "solarTermNote"],
          id: \.self
        ) { key in
          MongolianText(text: copy.text(key), height: 260, size: 19, scale: scale, color: .secondary)
        }
        ForEach(copy.sources, id: \.url) { source in
          if let url = URL(string: source.url), url.scheme == "https" {
            Link(destination: url) {
              VStack(spacing: 10) {
                Image(systemName: "arrow.up.right.square")
                MongolianText(text: source.label, height: 200, size: 20)
              }
            }
          }
        }
      }
    }
  }
  private func cards(_ fields: [(String, String)]) -> some View {
    ScrollView(.horizontal) {
      HStack(alignment: .top, spacing: 12) {
        ForEach(Array(fields.enumerated()), id: \.offset) { _, field in
          HStack(alignment: .top, spacing: 8) {
            MongolianText(text: field.0, height: 210, size: 18, color: .secondary)
            MongolianText(text: field.1, height: 210, size: 21, scale: scale)
          }
          .padding(12)
          .background(.quaternary.opacity(0.5), in: RoundedRectangle(cornerRadius: 14))
        }
      }
    }
  }
  private func terms(_ title: String, _ values: [String]) -> some View {
    VStack(alignment: .leading, spacing: 10) {
      Divider()
      ScrollView(.horizontal) {
        HStack(alignment: .top, spacing: 12) {
          MongolianText(text: title, height: 200, size: 22)
          ForEach(Array(values.enumerated()), id: \.offset) { _, value in
            MongolianText(text: value, height: 200, size: 21, scale: scale)
          }
        }
      }
    }
  }
}
