import Combine
import SwiftUI
import UniformTypeIdentifiers

@MainActor
final class CalendarModel: ObservableObject {
  @Published var date = CivilCalendar.today()
  @Published var month = String(CivilCalendar.today().prefix(7))
  @Published var view = UserDefaults.standard.string(forKey: "calendar.view") ?? "month" {
    didSet { UserDefaults.standard.set(view, forKey: "calendar.view") }
  }
  @Published var firstWeekday = UserDefaults.standard.integer(forKey: "calendar.firstWeekday") {
    didSet { UserDefaults.standard.set(firstWeekday, forKey: "calendar.firstWeekday") }
  }
  @Published var showLunar =
    (UserDefaults.standard.object(forKey: "calendar.showLunar") as? Bool) ?? true
  { didSet { UserDefaults.standard.set(showLunar, forKey: "calendar.showLunar") } }
  private var previousToday = CivilCalendar.today()
  let engine = try? CalendarEngine(root: AppModel.publicRoot)
  let appointments: AppointmentStore
  init(appointments: AppointmentStore? = nil) {
    self.appointments = appointments ?? AppointmentStore()
  }
  var today: String { CivilCalendar.today() }
  var days: [String] { CivilCalendar.days(month, firstWeekday: firstWeekday) }
  func select(_ value: String) {
    guard value >= "1901-01-01", value <= "2100-12-31", CivilCalendar.date(value) != nil else {
      return
    }
    date = value
    month = String(value.prefix(7))
  }
  func move(_ amount: Int) {
    if let value = destination(amount) { select(value) }
  }
  func destination(_ amount: Int) -> String? {
    let component: Calendar.Component = view == "day" || view == "week" ? .day : .month
    let count = amount * (view == "week" ? 7 : view == "year" ? 12 : 1)
    guard let value = CivilCalendar.moving(date, component: component, amount: count),
      value >= "1901-01-01", value <= "2100-12-31"
    else { return nil }
    return value
  }
  func refreshToday() {
    if date == previousToday { select(today) }
    previousToday = today
  }
}

struct NativeCalendar: View {
  @ObservedObject var model: CalendarModel
  @ObservedObject var store: AppointmentStore
  var scale: Double
  var skin: CalendarSkin
  @Environment(\.scenePhase) private var phase
  @Environment(\.dynamicTypeSize) private var typeSize
  private enum Panel {
    case month, views, search, day
    case edit(CalendarAppointment)
    case editOccurrence(CalendarAppointment)
    case detail(CalendarAppointment)
  }
  @State private var panel: Panel?
  @State private var query = ""
  @State private var pickerYear = 2026
  private let timer = Timer.publish(every: 60, on: .main, in: .common).autoconnect()
  init(model: CalendarModel, scale: Double = 1, skin: CalendarSkin = .light) {
    self.model = model
    self.store = model.appointments
    self.scale = scale
    self.skin = skin
  }
  var body: some View {
    GeometryReader { geometry in
      let compact = geometry.size.width < 600 || geometry.size.height < 640
      ScrollView {
        VStack(spacing: 12) {
          HStack {
            Button {
              pickerYear = Int(model.month.prefix(4)) ?? 2026
              panel = .month
            } label: {
              HStack {
                Text(
                  model.view == "year"
                    ? String(model.date.prefix(4))
                    : model.month.replacingOccurrences(of: "-", with: " / ")
                ).font(.system(size: 30, weight: .semibold, design: .rounded).monospacedDigit())
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
            }.accessibilityLabel(Copy.label("previous")).disabled(model.destination(-1) == nil)
            Button {
              model.move(1)
            } label: {
              Image(systemName: "chevron.right")
            }.accessibilityLabel(Copy.label("next")).disabled(model.destination(1) == nil)
          }.buttonStyle(.bordered).buttonBorderShape(.circle)
            .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
          if model.view == "year" {
            yearGrid
          } else if model.view == "week" {
            weekBoard
          } else if model.view == "day" {
            dayDetail
            agenda(model.date)
          } else if typeSize.isAccessibilitySize {
            selectedDaySummary
            agenda(model.date)
            accessibleMonth
          } else if geometry.size.width > 900 {
            HStack(alignment: .top, spacing: 28) {
              monthGrid(compact: compact)
              VStack(alignment: .leading, spacing: 20) {
                dayDetail
                agenda(model.date)
              }.frame(width: 320)
            }
          } else {
            monthGrid(compact: compact)
            if compact {
              selectedDaySummary
              agenda(model.date)
            } else {
              Divider()
              dayDetail
              agenda(model.date)
            }
          }
          if store.error {
            MongolianText(text: Copy.calendar("storageError"), height: 130, size: 23)
          }
          if store.undoAvailable {
            Button {
              store.undo()
            } label: {
              MongolianText(text: Copy.calendar("undo"), height: 90, size: 23)
            }.buttonStyle(.bordered)
          }
        }.padding().frame(maxWidth: 1400)
      }.frame(maxWidth: .infinity)
    }
    .toolbar {
      ToolbarItemGroup {
        Button {
          panel = .views
        } label: {
          Image(
            systemName: model.view == "year"
              ? "square.grid.2x2"
              : model.view == "day"
                ? "list.bullet" : model.view == "week" ? "calendar.day.timeline.left" : "calendar")
        }.accessibilityLabel(Copy.calendar("display"))
        Button {
          panel = .search
        } label: {
          Image(systemName: "magnifyingglass")
        }.accessibilityLabel(Copy.label("search"))
        Button {
          panel = .edit(CalendarAppointment(startDate: model.date, endDate: model.date))
        } label: {
          Image(systemName: "plus")
        }.accessibilityLabel(Copy.calendar("add"))
      }
    }
    .onReceive(timer) { _ in model.refreshToday() }
    .onChange(of: phase) { _, phase in if phase == .active { model.refreshToday() } }
    .sheet(isPresented: Binding(get: { panel != nil }, set: { if !$0 { panel = nil } })) {
      panelContent
    }
  }
  @ViewBuilder private var panelContent: some View {
    switch panel {
    case .month: monthPicker
    case .views: viewPicker
    case .search: searchView
    case .edit(let event):
      AppointmentEditor(draft: event, store: store, onSaved: didSave).id(event.id)
    case .editOccurrence(let event):
      AppointmentEditor(
        draft: store.individual(event), store: store, exception: event, onSaved: didSave
      )
      .id(event.id)
    case .detail(let event): appointmentDetail(event)
    case .day:
      ScrollView {
        VStack(alignment: .leading, spacing: 20) {
          HStack {
            Text(model.date).font(.title2.monospacedDigit())
            Spacer()
            Button {
              panel = nil
            } label: {
              Image(systemName: "xmark")
            }
            .accessibilityLabel(Copy.label("close"))
          }
          dayDetail
          agenda(model.date)
        }.padding(20)
      }.presentationDetents([.large])
    case nil: EmptyView()
    }
  }
  private var selectedDaySummary: some View {
    Button {
      panel = .day
    } label: {
      HStack(spacing: 16) {
        Text(String(Int(model.date.suffix(2))!)).font(.system(size: 28, weight: .medium))
          .monospacedDigit()
        MongolianText(text: Copy.weekdays[weekday(model.date)], height: 50, size: 22)
        if model.showLunar, let lunar = model.engine?.lunar(model.date) {
          HStack(spacing: 6) {
            Image(systemName: "moon")
            Text("\(lunar.month) / \(lunar.day)").monospacedDigit()
          }.font(.callout).foregroundStyle(.secondary)
        }
        Spacer()
        Image(systemName: "chevron.right")
      }.padding(.vertical, 10)
    }.buttonStyle(.plain).accessibilityLabel(model.date + " · " + Copy.calendar("agenda"))
  }
  private func didSave(_ event: CalendarAppointment) {
    model.select(event.startDate)
    if model.view == "year" { model.view = "month" }
  }
  private func weekday(_ date: String) -> Int {
    (CivilCalendar.calendar.component(.weekday, from: CivilCalendar.date(date)!) + 5) % 7
  }
  private func monthGrid(compact: Bool) -> some View {
    let days = model.days
    let items = store.occurrences(from: days.first!, to: days.last!)
    return VStack(spacing: 10) {
      HStack(spacing: 0) {
        ForEach(0..<7, id: \.self) { offset in
          let day = (offset + model.firstWeekday) % 7
          MongolianText(
            text: Copy.weekdays[day], height: 58, size: 21,
            color: day >= 5 ? .accentColor : .secondary
          ).frame(maxWidth: .infinity)
        }
      }
      LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 2), count: 7), spacing: 5)
      {
        ForEach(days, id: \.self) { value in
          let current = value == model.date
          let lunar = model.engine?.lunar(value)
          Button {
            model.select(value)
          } label: {
            VStack(spacing: compact ? 3 : 6) {
              Text(String(Int(value.suffix(2)) ?? 0)).font(.title3.monospacedDigit())
                .frame(width: 34, height: 34)
                .foregroundStyle(
                  current ? skin.canvas : (value == model.today ? Color.accentColor : .primary)
                )
                .background(current ? Color.accentColor : .clear, in: Circle())
              if model.showLunar, let lunar {
                Text(
                  (lunar.leap ? "* " : "")
                    + (lunar.day == 1 ? "\(lunar.month) / 1" : String(lunar.day))
                ).font(.system(size: 13).monospacedDigit()).opacity(current ? 1 : 0.75)
              }
              Circle().fill(
                items.contains { $0.startDate <= value && $0.endDate >= value }
                  ? Color.accentColor : .clear
              ).frame(width: 4, height: 4)
            }.foregroundStyle(
              current || value == model.today ? Color.accentColor : .primary
            )
            .frame(maxWidth: .infinity, minHeight: compact ? 58 : 68)
          }.buttonStyle(.plain).opacity(value.hasPrefix(model.month) ? 1 : 0.55)
            .disabled(value < "1901-01-01" || value > "2100-12-31").accessibilityLabel(value)
            .accessibilityAddTraits(current ? .isSelected : [])
        }
      }
    }
  }
  private var yearGrid: some View {
    LazyVGrid(
      columns: typeSize.isAccessibilitySize
        ? [GridItem(.flexible())] : [GridItem(.adaptive(minimum: 150), spacing: 16)], spacing: 16
    ) {
      ForEach(1...12, id: \.self) { number in
        let month = String(format: "%@-%02d", String(model.date.prefix(4)), number)
        Button {
          model.select(month + "-01")
          model.view = "month"
        } label: {
          VStack(alignment: .leading, spacing: 12) {
            Text(String(number)).font(.title2.monospacedDigit())
            LazyVGrid(
              columns: Array(repeating: GridItem(.flexible(), spacing: 0), count: 7), spacing: 6
            ) {
              ForEach(CivilCalendar.days(month, firstWeekday: model.firstWeekday), id: \.self) {
                day in
                Text(String(Int(day.suffix(2))!)).font(.caption.monospacedDigit()).opacity(
                  day.hasPrefix(month) ? 1 : 0.35)
              }
            }
          }.padding(8)
        }.buttonStyle(.bordered)
      }
    }
  }
  private var weekBoard: some View {
    let offset = (weekday(model.date) - model.firstWeekday + 7) % 7
    let first = CivilCalendar.moving(model.date, component: .day, amount: -offset)!
    return ScrollView(.horizontal) {
      HStack(alignment: .top, spacing: 16) {
        ForEach(0..<7, id: \.self) { index in
          let day = CivilCalendar.moving(first, component: .day, amount: index)!
          VStack(alignment: .leading, spacing: 16) {
            Button {
              model.select(day)
              model.view = "day"
            } label: {
              HStack {
                MongolianText(text: Copy.weekdays[weekday(day)], height: 85, size: 23)
                Text(String(Int(day.suffix(2))!)).font(.title2.monospacedDigit())
              }
            }.buttonStyle(.bordered)
            agenda(day)
          }.frame(width: typeSize.isAccessibilitySize ? 260 : 170).disabled(
            day < "1901-01-01" || day > "2100-12-31")
        }
      }
    }
  }
  private func agenda(_ date: String) -> some View {
    NativeAgenda(
      items: store.occurrences(from: date, to: date), onOpen: { panel = .detail($0) },
      onAdd: { panel = .edit(CalendarAppointment(startDate: date, endDate: date)) })
  }
  private var dayDetail: some View {
    ViewThatFits(in: .horizontal) {
      HStack(alignment: .top, spacing: 24) {
        datePair(
          Copy.calendar("gregorian"), year: Int(model.date.prefix(4))!,
          month: Int(model.date.dropFirst(5).prefix(2))!, day: Int(model.date.suffix(2))!
        ).frame(maxWidth: .infinity, alignment: .leading)
        if model.showLunar, let lunar = model.engine?.lunar(model.date) {
          datePair(
            Copy.calendar("lunar"), year: lunar.year, month: lunar.month, day: lunar.day,
            leap: lunar.leap
          ).frame(maxWidth: .infinity, alignment: .leading)
        }
      }
      VStack(alignment: .leading, spacing: 24) {
        datePair(
          Copy.calendar("gregorian"), year: Int(model.date.prefix(4))!,
          month: Int(model.date.dropFirst(5).prefix(2))!, day: Int(model.date.suffix(2))!)
        if model.showLunar, let lunar = model.engine?.lunar(model.date) {
          datePair(
            Copy.calendar("lunar"), year: lunar.year, month: lunar.month, day: lunar.day,
            leap: lunar.leap)
        }
      }
    }
  }
  private var accessibleMonth: some View {
    LazyVStack(spacing: 16) {
      ForEach(model.days.filter { $0.hasPrefix(model.month) }, id: \.self) { value in
        Button {
          model.select(value)
        } label: {
          HStack(alignment: .top, spacing: 16) {
            VStack(alignment: .leading, spacing: 10) {
              Text(String(Int(value.suffix(2))!)).font(.title2.monospacedDigit())
              if model.showLunar, let lunar = model.engine?.lunar(value) {
                Text("\(lunar.month)/\(lunar.day)").font(.caption.monospacedDigit())
                  .foregroundStyle(.secondary)
              }
            }.frame(minWidth: 64, alignment: .leading)
            MongolianText(text: Copy.weekdays[weekday(value)], height: 85, size: 23)
            Spacer(minLength: 0)
            if value == model.date {
              Image(systemName: "checkmark.circle.fill").foregroundStyle(Color.accentColor)
            }
          }.padding(.vertical, 8).frame(maxWidth: .infinity, alignment: .leading)
        }.buttonStyle(.plain).accessibilityLabel(value).accessibilityAddTraits(
          value == model.date ? .isSelected : [])
        Divider()
      }
    }
  }
  private func datePair(_ label: String, year: Int, month: Int, day: Int, leap: Bool = false)
    -> some View
  {
    HStack(alignment: .top, spacing: 10) {
      MongolianText(text: label, height: 145, size: 23)
      VStack(alignment: .leading, spacing: 10) {
        Text(String(year)).font(.callout.monospacedDigit()).foregroundStyle(.secondary)
        Text("\(month) / \(day)").font(.title2.monospacedDigit())
        if leap { MongolianText(text: Copy.calendar("leapMonth"), height: 90, size: 22) }
      }.fixedSize(horizontal: true, vertical: false).padding(.top, 5)
    }
  }
  private var monthPicker: some View {
    VStack(spacing: 24) {
      HStack {
        Stepper(value: $pickerYear, in: 1901...2100) {
          Text(String(pickerYear)).font(.largeTitle.monospacedDigit())
        }
        Button {
          panel = nil
        } label: {
          Image(systemName: "xmark")
        }.accessibilityLabel(Copy.label("close"))
      }
      LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: 16) {
        ForEach(1...12, id: \.self) { month in
          Button {
            model.select(String(format: "%04d-%02d-01", pickerYear, month))
            panel = nil
          } label: {
            Text(String(month)).frame(maxWidth: .infinity, minHeight: 44)
          }.buttonStyle(.bordered)
        }
      }
    }.padding()
      #if os(macOS)
        .frame(width: 360, height: 380)
      #endif
      .presentationDetents([.medium])
  }
  private var viewPicker: some View {
    ScrollView(.horizontal) {
      HStack(alignment: .top, spacing: 16) {
        ForEach(["year", "month", "week", "day"], id: \.self) { view in
          Button {
            model.view = view
            panel = nil
          } label: {
            MongolianText(text: Copy.calendar(view), height: 130, size: 26)
          }.buttonStyle(.bordered)
        }
        Button {
          panel = nil
        } label: {
          Image(systemName: "xmark")
        }.accessibilityLabel(Copy.label("close"))
      }.padding(24)
    }
    #if os(macOS)
      .frame(minWidth: 420, minHeight: 220)
    #endif
    .presentationDetents([.medium])
  }
  private var searchView: some View {
    VStack(alignment: .leading, spacing: 20) {
      HStack {
        MongolianText(text: Copy.label("search"), height: 100, size: 28)
        Spacer()
        Button {
          panel = nil
        } label: {
          Image(systemName: "xmark")
        }.accessibilityLabel(Copy.label("close"))
      }
      MongolianTextInput(text: $query, label: Copy.label("search")).frame(height: 150)
      ScrollView(.horizontal) {
        HStack(alignment: .top, spacing: 16) {
          ForEach(
            store.events.filter {
              query.isEmpty || $0.title.contains(query) || $0.notes.contains(query)
                || $0.location.contains(query)
            }
          ) { event in
            Button {
              model.select(event.startDate)
              panel = .edit(event)
            } label: {
              VStack {
                Text(event.startDate).monospacedDigit()
                MongolianText(text: event.title, height: 230, size: 26)
              }
            }.buttonStyle(.bordered)
          }
        }
      }
    }.padding(20)
      #if os(macOS)
        .frame(width: 680, height: 620)
      #endif
  }
  private func appointmentDetail(_ event: CalendarAppointment) -> some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 20) {
        HStack(alignment: .top) {
          MongolianText(text: event.title, height: 180, size: 30, scale: scale)
          Spacer()
          Button {
            panel = nil
          } label: {
            Image(systemName: "xmark")
          }
          .accessibilityLabel(Copy.label("close"))
        }
        Text(event.startDate + (event.endDate != event.startDate ? " — " + event.endDate : ""))
          .monospacedDigit()
        if event.allDay {
          MongolianText(text: Copy.calendar("allDay"), height: 100, size: 23)
        } else {
          Text(event.startTime + " — " + event.endTime).monospacedDigit()
        }
        ScrollView(.horizontal) {
          HStack(alignment: .top, spacing: 20) {
            if !event.location.isEmpty {
              MongolianText(text: event.location, height: 180, size: 25)
            }
            if !event.notes.isEmpty {
              MongolianText(text: event.notes, height: 220, size: 27, scale: scale)
            }
          }
        }
        HStack(alignment: .top, spacing: 16) {
          Button {
            let id = event.eventId ?? event.id
            let original = store.events.first { $0.id == id }
            if let original { panel = .edit(original) }
          } label: {
            MongolianText(
              text: (event.frequency == "none" ? "" : Copy.calendar("series") + " · ")
                + Copy.calendar("edit"), height: 110,
              size: 24)
          }
          Button(role: .destructive) {
            store.remove(event, onlyThis: false)
            panel = nil
          } label: {
            MongolianText(
              text: (event.frequency == "none" ? "" : Copy.calendar("series") + " · ")
                + Copy.calendar("delete"), height: 110,
              size: 24)
          }
          if event.frequency != "none" {
            Button {
              panel = .editOccurrence(event)
            } label: {
              VStack(alignment: .leading) {
                Image(systemName: "pencil")
                MongolianText(text: Copy.calendar("thisOccurrence"), height: 110, size: 24)
              }
            }.accessibilityLabel(Copy.calendar("thisOccurrence") + " · " + Copy.calendar("edit"))
            Button(role: .destructive) {
              store.remove(event, onlyThis: true)
              panel = nil
            } label: {
              VStack(alignment: .leading) {
                Image(systemName: "trash")
                MongolianText(text: Copy.calendar("thisOccurrence"), height: 110, size: 24)
              }
            }.accessibilityLabel(Copy.calendar("thisOccurrence") + " · " + Copy.calendar("delete"))
          }
        }.buttonStyle(.bordered)
      }.padding(20)
    }
    #if os(macOS)
      .frame(width: 620, height: 650)
    #endif
  }
}
