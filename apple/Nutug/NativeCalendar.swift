import Combine
import SwiftUI

@MainActor
final class CalendarModel: ObservableObject {
  @Published var date = CivilCalendar.today()
  @Published var month = String(CivilCalendar.today().prefix(7))
  private var previousToday = CivilCalendar.today()
  let engine = try? CalendarEngine(root: AppModel.publicRoot)
  var today: String { CivilCalendar.today() }
  var days: [String] { CivilCalendar.days(month) }
  func select(_ value: String) {
    guard value >= "1901-01-01", value <= "2100-12-31", CivilCalendar.date(value) != nil else {
      return
    }
    date = value
    month = String(value.prefix(7))
  }
  func move(_ amount: Int) {
    guard let value = CivilCalendar.moving(month + "-01", component: .month, amount: amount),
      value >= "1901-01-01", value <= "2100-12-31"
    else { return }
    month = String(value.prefix(7))
  }
  func refreshToday() {
    if date == previousToday { select(today) }
    previousToday = today
  }
}
struct NativeCalendar: View {
  @ObservedObject var model: CalendarModel
  @Environment(\.scenePhase) private var phase
  @State private var picker = false
  @State private var pickerYear = 2026
  @State private var pickerMonth = 1
  private let timer = Timer.publish(every: 60, on: .main, in: .common).autoconnect()
  var body: some View {
    GeometryReader { geometry in
      ScrollView {
        VStack(spacing: 24) {
          HStack {
            Button {
              pickerYear = Int(model.month.prefix(4)) ?? 2026
              pickerMonth = Int(model.month.suffix(2)) ?? 1
              picker = true
            } label: {
              HStack {
                Text(model.month.replacingOccurrences(of: "-", with: " / ")).font(
                  .title.monospacedDigit())
                Image(systemName: "chevron.down").font(.caption)
              }
            }.buttonStyle(.plain).accessibilityLabel(Copy.calendar("choose"))
            Spacer()
            Button {
              model.select(model.today)
            } label: {
              Image(systemName: "calendar.circle")
            }.accessibilityLabel(Copy.calendar("today"))
            Button {
              model.move(-1)
            } label: {
              Image(systemName: "chevron.left")
            }.disabled(model.month == "1901-01").accessibilityLabel(Copy.label("previous"))
            Button {
              model.move(1)
            } label: {
              Image(systemName: "chevron.right")
            }.disabled(model.month == "2100-12").accessibilityLabel(Copy.label("next"))
          }.buttonStyle(.bordered)
          if geometry.size.width > 820 {
            HStack(alignment: .top, spacing: 36) {
              monthGrid
              Divider()
              dayDetail(compact: false).frame(width: 240)
            }
          } else {
            monthGrid
            Divider()
            dayDetail(compact: true)
          }
        }.padding().frame(maxWidth: 1200)
      }.frame(maxWidth: .infinity)
    }
    .onReceive(timer) { _ in model.refreshToday() }
    .onChange(of: phase) { _, phase in if phase == .active { model.refreshToday() } }
    .sheet(isPresented: $picker) {
      NavigationStack {
        VStack(spacing: 24) {
          Stepper(value: $pickerYear, in: 1901...2100) {
            Text(String(pickerYear)).font(.largeTitle.monospacedDigit())
          }
          LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: 16) {
            ForEach(1...12, id: \.self) { month in
              Button {
                model.month = String(format: "%04d-%02d", pickerYear, month)
                picker = false
              } label: {
                Text(String(month)).frame(maxWidth: .infinity, minHeight: 44)
              }.buttonStyle(.bordered)
            }
          }
        }.padding()
          .toolbar {
            ToolbarItem(placement: .cancellationAction) {
              Button {
                picker = false
              } label: {
                Image(systemName: "xmark")
              }.accessibilityLabel(Copy.label("close"))
            }
          }
      }
      #if os(macOS)
        .frame(width: 360, height: 380)
      #endif
      .presentationDetents([.medium])
    }
  }
  private var monthGrid: some View {
    VStack(spacing: 10) {
      HStack(spacing: 0) {
        ForEach(Array(Copy.weekdays.enumerated()), id: \.offset) { index, name in
          MongolianText(text: name, height: 75, size: 21).frame(maxWidth: .infinity)
            .foregroundStyle(index >= 5 ? Color.accentColor : Color.secondary)
        }
      }
      LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 7), spacing: 5)
      {
        ForEach(model.days, id: \.self) { value in
          let selected = value == model.date
          let lunar = model.engine?.lunar(value)
          Button {
            model.select(value)
          } label: {
            VStack(spacing: 7) {
              Text(String(Int(value.suffix(2)) ?? 0)).font(.title3.monospacedDigit())
              if let lunar {
                Text(
                  (lunar.leap ? "* " : "")
                    + (lunar.day == 1 ? "\(lunar.month) / 1" : String(lunar.day))
                ).font(
                  .system(size: 13).monospacedDigit()
                ).opacity(selected ? 1 : 0.65)
              }
            }
            .foregroundStyle(
              selected ? Color.white : (value == model.today ? Color.accentColor : Color.primary)
            )
            .frame(maxWidth: .infinity, minHeight: 62)
            .background(
              selected ? Color.accentColor : Color.clear, in: RoundedRectangle(cornerRadius: 16))
          }
          .buttonStyle(.plain)
          .opacity(value.hasPrefix(model.month) ? 1 : 0.55)
          .disabled(value < "1901-01-01" || value > "2100-12-31")
          .accessibilityLabel(value)
          .accessibilityAddTraits(selected ? .isSelected : [])
        }
      }
    }
  }
  @ViewBuilder
  private func dayDetail(compact: Bool) -> some View {
    if compact {
      HStack(alignment: .top, spacing: 24) {
        civilPair.frame(maxWidth: .infinity, alignment: .leading)
        lunarPair.frame(maxWidth: .infinity, alignment: .leading)
      }.frame(maxWidth: .infinity, alignment: .leading)
    } else {
      VStack(alignment: .leading, spacing: 28) {
        Text(String(Int(model.date.suffix(2)) ?? 0)).font(.system(size: 64, weight: .light))
          .monospacedDigit()
        civilPair
        lunarPair
      }.frame(maxWidth: .infinity, alignment: .leading)
    }
  }
  private var civilPair: some View {
    let parts = model.date.split(separator: "-").compactMap { Int($0) }
    return datePair(Copy.calendar("gregorian"), year: parts[0], month: parts[1], day: parts[2])
  }
  @ViewBuilder private var lunarPair: some View {
    if let lunar = model.engine?.lunar(model.date) {
      datePair(
        Copy.calendar("lunar"),
        year: lunar.year, month: lunar.month, day: lunar.day, leap: lunar.leap)
    }
  }
  private func datePair(_ label: String, year: Int, month: Int, day: Int, leap: Bool = false)
    -> some View
  {
    HStack(alignment: .top, spacing: 10) {
      MongolianText(text: label, height: 155, size: 23)
      VStack(alignment: .leading, spacing: 10) {
        Text(String(year)).font(.callout.monospacedDigit()).foregroundStyle(.secondary)
        Text("\(month) / \(day)").font(.title2.monospacedDigit())
        if leap { MongolianText(text: Copy.calendar("leapMonth"), height: 90, size: 22) }
      }.fixedSize(horizontal: true, vertical: false).padding(.top, 5)
    }
  }
}
