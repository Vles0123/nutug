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
  @discardableResult func selectInput(_ input: String) -> Bool {
    let value = CivilCalendar.normalizedInput(input)
    guard value >= "1901-01-01", value <= "2100-12-31", CivilCalendar.date(value) != nil else {
      return false
    }
    select(value)
    return true
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
  var onSettings: (() -> Void)?
  @Environment(\.scenePhase) private var phase
  @Environment(\.dynamicTypeSize) private var typeSize
  private enum Panel {
    case month, views, search
    case edit(CalendarAppointment)
    case editOccurrence(CalendarAppointment)
    case detail(CalendarAppointment)
  }
  @State private var panel: Panel?
  @State private var query = ""
  @State private var pickerYear = 2026
  @State private var pickerDate = ""
  @State private var invalidPickerDate = false
  @FocusState private var pickerDateFocused: Bool
  private let timer = Timer.publish(every: 60, on: .main, in: .common).autoconnect()
  init(
    model: CalendarModel, scale: Double = 1, skin: CalendarSkin = .light,
    onSettings: (() -> Void)? = nil
  ) {
    self.model = model
    self.store = model.appointments
    self.scale = scale
    self.skin = skin
    self.onSettings = onSettings
  }
  var body: some View {
    GeometryReader { geometry in
      let compact = geometry.size.width < 600 || geometry.size.height < 720
      VStack(spacing: 8) {
        calendarHeader.padding(.horizontal).padding(.top, 8)
        if model.view == "week" || model.view == "day" {
          NativeCalendarTimeline(
            model: model, store: store, scale: scale, skin: skin,
            onOpen: { panel = .detail($0) },
            onAdd: { date, minute, allDay in
              if let draft = store.draft(date: date, minute: minute, allDay: allDay) {
                panel = .edit(draft)
              }
            })
        } else {
          ScrollView {
            VStack(spacing: 8) {
              if model.view == "year" {
                yearGrid
              } else if typeSize.isAccessibilitySize {
                selectedDaySummary
                agenda(model.date)
                accessibleMonth
              } else if geometry.size.width > 900 {
                HStack(alignment: .top, spacing: 28) {
                  monthGrid(compact: compact, availableHeight: geometry.size.height - 96)
                  VStack(alignment: .leading, spacing: 20) {
                    selectedDaySummary
                    agenda(model.date)
                  }.frame(width: 320)
                }
              } else {
                monthGrid(compact: true)
                Divider()
                selectedDaySummary
                agenda(model.date)
              }
            }.padding(.horizontal).padding(.vertical, 8).frame(maxWidth: 1400)
          }.frame(maxWidth: .infinity)
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
      }.frame(width: geometry.size.width, height: geometry.size.height)
    }
    #if os(iOS)
      .safeAreaInset(edge: .bottom, spacing: 0) {
        HStack(spacing: 16) {
          viewButton
          Spacer(minLength: 0)
          searchButton
          if let onSettings {
            Button(action: onSettings) { Image(systemName: "slider.horizontal.3") }
            .accessibilityLabel(Copy.label("settings")).frame(minWidth: 44, minHeight: 44)
          }
          addButton
        }.buttonStyle(.borderless).controlSize(.large)
        .padding(.horizontal, 20).padding(.vertical, 10).background(.bar)
      }
    #else
      .toolbar {
        ToolbarItemGroup {
          viewButton
          searchButton
          addButton
        }
      }
    #endif
    .onReceive(timer) { _ in model.refreshToday() }
    .onChange(of: phase) { _, phase in if phase == .active { model.refreshToday() } }
    .sheet(isPresented: Binding(get: { panel != nil }, set: { if !$0 { panel = nil } })) {
      panelContent
    }
  }
  private var calendarHeader: some View {
    HStack {
      Button {
        pickerYear = Int(model.month.prefix(4)) ?? 2026
        pickerDate = model.date
        invalidPickerDate = false
        panel = .month
      } label: {
        HStack {
          Text(
            model.view == "year"
              ? String(model.date.prefix(4))
              : model.view == "day"
                ? model.date : model.month.replacingOccurrences(of: "-", with: " / ")
          ).font(
            .system(size: model.view == "day" ? 24 : 30, weight: .semibold, design: .rounded)
              .monospacedDigit()
          )
          .lineLimit(1).minimumScaleFactor(0.75)
          Image(systemName: "chevron.down").font(.caption)
        }
      }.buttonStyle(.plain).accessibilityLabel(
        Copy.calendar("gregorian") + " · " + Copy.calendar("choose") + " · " + model.date)
      Spacer()
      Button {
        model.select(model.today)
      } label: {
        MongolianLabel(text: Copy.calendar("today"), height: 56, size: 18)
      }.frame(minWidth: 44, minHeight: 44).accessibilityLabel(Copy.calendar("today"))
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
    }.buttonStyle(.borderless).controlSize(.large)
      .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
  }
  private var viewButton: some View {
    Button {
      panel = .views
    } label: {
      HStack(spacing: 8) {
        Image(
          systemName: model.view == "year"
            ? "square.grid.2x2"
            : model.view == "day"
              ? "list.bullet" : model.view == "week" ? "calendar.day.timeline.left" : "calendar")
        #if os(iOS)
          MongolianLabel(text: Copy.calendar(model.view), height: 56, size: 20)
        #endif
      }
    }.accessibilityLabel(Copy.calendar("display") + " · " + Copy.calendar(model.view))
  }
  private var searchButton: some View {
    Button {
      panel = .search
    } label: {
      Image(systemName: "magnifyingglass")
    }
    .accessibilityLabel(Copy.label("search")).frame(minWidth: 44, minHeight: 44)
  }
  private var addButton: some View {
    Button {
      panel = .edit(CalendarAppointment(startDate: model.date, endDate: model.date))
    } label: {
      Image(systemName: "plus")
    }
    .buttonStyle(.borderedProminent).buttonBorderShape(.circle).accessibilityLabel(
      Copy.calendar("add"))
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
    case nil: EmptyView()
    }
  }
  private var selectedDaySummary: some View {
    Button {
      model.view = "day"
    } label: {
      HStack(spacing: 16) {
        Text(String(Int(model.date.suffix(2))!)).font(.system(size: 28, weight: .medium))
          .monospacedDigit()
        MongolianLabel(text: Copy.weekdays[weekday(model.date)], height: 56, size: 21)
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
  private func monthGrid(compact: Bool, availableHeight: CGFloat? = nil) -> some View {
    let days = model.days
    let rowHeight = availableHeight.map {
      max(70, ($0 - (compact ? 60 : 68)) / CGFloat(days.count / 7))
    }
    return VStack(spacing: 0) {
      HStack(spacing: 0) {
        ForEach(0..<7, id: \.self) { offset in
          let day = (offset + model.firstWeekday) % 7
          MongolianLabel(
            text: Copy.weekdays[day], height: compact ? 50 : 58,
            size: compact ? 18 : 20, color: day >= 5 ? .accentColor : .secondary
          ).frame(height: compact ? 50 : 58, alignment: .top).frame(maxWidth: .infinity)
        }
      }.padding(.bottom, 10)
      ForEach(0..<(days.count / 7), id: \.self) { row in
        Divider()
        HStack(alignment: .top, spacing: 0) {
          ForEach(Array(days[(row * 7)..<(row * 7 + 7)]), id: \.self) { value in
            monthCell(value, compact: compact, rowHeight: rowHeight ?? 140)
          }
        }
      }
    }
  }
  private func monthCell(_ value: String, compact: Bool, rowHeight: CGFloat) -> some View {
    let current = value == model.date
    let lunar = model.showLunar ? model.engine?.lunar(value) : nil
    let layout = store.timeline(value)
    let items = layout.allDay + layout.timed.map(\.event)
    return VStack(spacing: compact ? 1 : 3) {
      Button {
        if current { model.view = "day" } else { model.select(value) }
      } label: {
        VStack(spacing: compact ? 1 : 3) {
          Text(String(Int(value.suffix(2)) ?? 0)).font(
            (compact ? Font.body : .title3).monospacedDigit()
          )
          .frame(width: compact ? 28 : 34, height: compact ? 28 : 34)
          .foregroundStyle(
            current ? skin.canvas : (value == model.today ? Color.accentColor : .primary)
          )
          .background(current ? Color.accentColor : .clear, in: Circle())
          if let lunar {
            Text(
              (lunar.leap ? "* " : "") + (lunar.day == 1 ? "\(lunar.month) / 1" : String(lunar.day))
            )
            .font(.system(size: compact ? 11 : 13).monospacedDigit()).foregroundStyle(.secondary)
          }
          if compact {
            VStack(spacing: 1) {
              ForEach(Array(items.prefix(3))) { event in
                Capsule().fill(
                  skin == .ink ? .primary : calendarEventColor(event.color, skin: skin)
                ).frame(
                  width: 24, height: 3)
              }
            }.frame(height: 8, alignment: .top)
          }
        }.frame(maxWidth: .infinity, minHeight: compact ? 52 : 56, alignment: .top).padding(
          .top, compact ? 4 : 6)
      }.buttonStyle(.plain).frame(width: compact ? nil : 42).disabled(
        value < "1901-01-01" || value > "2100-12-31"
      )
      .accessibilityLabel(value).accessibilityAddTraits(current ? .isSelected : [])
      if !compact {
        HStack(alignment: .top, spacing: 3) {
          ForEach(Array(items.prefix(1))) { event in
            Button {
              panel = .detail(event)
            } label: {
              MongolianCalendarPreview(
                text: event.title, scale: scale,
                color: skin == .ink ? .primary : calendarEventColor(event.color, skin: skin)
              )
              .frame(height: rowHeight - 12).padding(3)
              .background(
                calendarEventColor(event.color, skin: skin).opacity(0.09),
                in: RoundedRectangle(cornerRadius: 4)
              )
            }.buttonStyle(.plain).accessibilityLabel(event.title)
          }
          if items.count > 1 {
            Button {
              model.select(value)
              model.view = "day"
            } label: {
              Text("+\(items.count - 1)").font(.caption2)
            }
            .buttonStyle(.plain).accessibilityLabel(Copy.calendar("agenda") + " · " + value)
          }
        }.frame(height: rowHeight - 6).padding(.horizontal, 3).padding(.bottom, 6)
      }
    }.frame(maxWidth: .infinity).opacity(value.hasPrefix(model.month) ? 1 : 0.5)
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
  private func agenda(_ date: String) -> some View {
    NativeAgenda(
      items: store.timeline(date).allDay + store.timeline(date).timed.map(\.event),
      onOpen: { panel = .detail($0) },
      onAdd: { panel = .edit(CalendarAppointment(startDate: date, endDate: date)) }, scale: scale,
      skin: skin)
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
  private var monthPicker: some View {
    ScrollView {
      VStack(spacing: 24) {
        HStack(spacing: 12) {
          MongolianLabel(text: Copy.calendar("gregorian"))
          TextField("", text: $pickerDate).font(.body.monospacedDigit())
            .textFieldStyle(.roundedBorder).accessibilityLabel(Copy.calendar("choose"))
            .focused($pickerDateFocused).onSubmit(jumpToDate)
            .onChange(of: pickerDate) { _, _ in invalidPickerDate = false }
          Button(action: jumpToDate) {
            Image(systemName: "checkmark")
          }.buttonStyle(.bordered).accessibilityLabel(Copy.calendar("choose"))
        }
        if invalidPickerDate {
          MongolianLabel(text: Copy.calendar("choose"))
        }
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
              let offset =
                (pickerYear - Int(model.date.prefix(4))!) * 12 + month - Int(
                  model.date.dropFirst(5).prefix(2))!
              if let date = CivilCalendar.moving(model.date, component: .month, amount: offset) {
                model.select(date)
                if model.view == "year" { model.view = "month" }
              }
              panel = nil
            } label: {
              Text(String(month)).frame(maxWidth: .infinity, minHeight: 44)
            }.buttonStyle(.bordered)
          }
        }
      }.padding()
    }
    #if os(macOS)
      .frame(width: 400, height: 520)
    #endif
    .presentationDetents([.large])
  }
  private func jumpToDate() {
    if model.selectInput(pickerDate) {
      if model.view == "year" { model.view = "month" }
      panel = nil
    } else {
      invalidPickerDate = true
      pickerDateFocused = true
    }
  }
  private var viewPicker: some View {
    ScrollView(.horizontal) {
      HStack(alignment: .top, spacing: 16) {
        ForEach(["year", "month", "week", "day"], id: \.self) { view in
          Button {
            model.view = view
            panel = nil
          } label: {
            MongolianLabel(text: Copy.calendar(view), height: 84, size: 23)
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
                MongolianText(text: event.title, height: 230, size: 26, scale: scale)
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
              MongolianText(text: event.location, height: 180, size: 25, scale: scale)
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

struct NativeCalendarTimeline: View {
  @ObservedObject var model: CalendarModel
  @ObservedObject var store: AppointmentStore
  var scale: Double
  var skin: CalendarSkin
  let onOpen: (CalendarAppointment) -> Void
  let onAdd: (String, Int, Bool) -> Void
  @State private var now = Date()
  @State private var gridY: CGFloat = 0
  @State private var cachedLayouts: [String: CalendarDayLayout] = [:]
  @ScaledMetric(relativeTo: .body) private var baseHourHeight: CGFloat = 96
  private var hourHeight: CGFloat { baseHourHeight * CGFloat(scale) }
  private let gutter: CGFloat = 48
  private var weekDays: [String] {
    let weekday =
      (CivilCalendar.calendar.component(.weekday, from: CivilCalendar.date(model.date)!) + 5) % 7
    let first = CivilCalendar.moving(
      model.date, component: .day, amount: -((weekday - model.firstWeekday + 7) % 7))!
    return (0..<7).map { CivilCalendar.moving(first, component: .day, amount: $0)! }
  }
  private var days: [String] { model.view == "day" ? [model.date] : weekDays }
  private func clock(_ minute: Double) -> String {
    String(format: "%02d:%02d", Int(minute) / 60, Int(minute) % 60)
  }
  private func color(_ event: CalendarAppointment) -> Color {
    skin == .ink ? .primary : calendarEventColor(event.color, skin: skin)
  }
  private func weekday(_ day: String) -> Int {
    (CivilCalendar.calendar.component(.weekday, from: CivilCalendar.date(day)!) + 5) % 7
  }
  var body: some View {
    let layouts = days.map { cachedLayouts[$0] ?? CalendarDayLayout() }
    VStack(spacing: 0) {
      if model.view == "day" { weekStrip }
      timelineViewport(layouts)
    }
    .onChange(of: days, initial: true) { _, _ in refreshLayouts() }
    .onChange(of: store.events) { _, _ in refreshLayouts() }
    .onReceive(Timer.publish(every: 60, on: .main, in: .common).autoconnect()) { now = $0 }
  }
  private var weekStrip: some View {
    HStack(spacing: 0) {
      ForEach(weekDays, id: \.self) { day in
        Button {
          model.select(day)
        } label: {
          VStack(spacing: 6) {
            MongolianLabel(text: Copy.weekdays[weekday(day)], height: 50, size: 18)
              .frame(height: 50, alignment: .top)
            Text(String(Int(day.suffix(2))!)).font(.body.monospacedDigit())
              .frame(width: 30, height: 30)
              .foregroundStyle(day == model.date ? skin.canvas : .primary)
              .background(day == model.date ? Color.accentColor : .clear, in: Circle())
          }.frame(maxWidth: .infinity)
        }.buttonStyle(.plain).accessibilityLabel(day)
          .accessibilityAddTraits(day == model.date ? .isSelected : [])
          .disabled(day < "1901-01-01" || day > "2100-12-31")
      }
    }.padding(.horizontal, 12).padding(.bottom, 10)
  }
  private func columnWidth(_ available: CGFloat, layouts: [CalendarDayLayout]) -> CGFloat {
    let lanes: Int = layouts.flatMap(\.timed).map(\.columns).max() ?? 1
    let fitted: CGFloat = (available - gutter) / CGFloat(days.count)
    let minimum: CGFloat = max(96, CGFloat(lanes) * 72 * CGFloat(scale))
    return max(fitted, minimum)
  }
  private func timelineViewport(_ layouts: [CalendarDayLayout]) -> some View {
    GeometryReader { geometry in
      let column = columnWidth(geometry.size.width, layouts: layouts)
      let allDayHeight: CGFloat =
        layouts.contains(where: { !$0.allDay.isEmpty })
        ? 84 * CGFloat(scale) + 18 : 0
      HStack(spacing: 0) {
        timeRuler(allDayHeight: allDayHeight).frame(width: gutter)
        scrollingTimeline(layouts, columnWidth: column)
      }.frame(width: geometry.size.width, height: geometry.size.height).clipped()
    }
  }
  private func scrollingTimeline(_ layouts: [CalendarDayLayout], columnWidth: CGFloat) -> some View
  {
    let width = columnWidth * CGFloat(days.count)
    return ScrollViewReader { proxy in
      ScrollView([.horizontal, .vertical]) {
        LazyVStack(spacing: 0, pinnedViews: [.sectionHeaders]) {
          Section {
            timeGrid(layouts, columnWidth: columnWidth)
          } header: {
            fixedHeading(layouts, columnWidth: columnWidth)
          }
        }.frame(width: width)
      }
      .onAppear { scrollToSelection(proxy) }
      .onChange(of: scale) { _, _ in scrollToSelection(proxy) }
      .onChange(of: model.date) { _, _ in scrollToSelection(proxy) }
    }
  }
  private func scrollToSelection(_ proxy: ScrollViewProxy) {
    proxy.scrollTo("calendar-scroll-" + model.date + "-14", anchor: .topLeading)
  }
  private func fixedHeading(_ layouts: [CalendarDayLayout], columnWidth: CGFloat) -> some View {
    VStack(spacing: 0) {
      timeHeading(columnWidth: columnWidth)
      if layouts.contains(where: { !$0.allDay.isEmpty }) {
        allDayBand(layouts, columnWidth: columnWidth)
      }
    }.background(skin.canvas)
  }
  private func timeGrid(_ layouts: [CalendarDayLayout], columnWidth: CGFloat) -> some View {
    ZStack(alignment: .topLeading) {
      VStack(spacing: 0) {
        ForEach(0..<25, id: \.self) { hour in
          Rectangle().fill(Color.secondary.opacity(0.18)).frame(height: 0.5)
            .frame(height: hourHeight, alignment: .top)
        }
      }
      HStack(alignment: .top, spacing: 0) {
        ForEach(Array(days.enumerated()), id: \.element) { index, day in
          timeColumn(day, layout: layouts[index], width: columnWidth)
        }
      }
    }.frame(width: columnWidth * CGFloat(days.count), height: hourHeight * 25)
      .onGeometryChange(for: CGFloat.self) {
        $0.frame(in: .scrollView).minY
      } action: {
        gridY = $0
      }
      .padding(.top, 8)
  }
  private func refreshLayouts() {
    cachedLayouts = Dictionary(uniqueKeysWithValues: days.map { ($0, store.timeline($0)) })
  }
  private func timeRuler(allDayHeight: CGFloat) -> some View {
    let heading: CGFloat = days.count > 1 ? 68 : 48
    return GeometryReader { geometry in
      ZStack(alignment: .topTrailing) {
        skin.canvas
        ForEach(0..<25, id: \.self) { hour in
          Text(clock(Double(hour * 60))).font(.system(size: 10).monospacedDigit()).foregroundStyle(
            .secondary
          )
          .offset(x: -6, y: gridY + CGFloat(hour) * hourHeight - 5)
        }
        VStack(spacing: 0) {
          MongolianLabel(text: Copy.calendar("time"), height: 42, size: 18, color: .secondary)
            .frame(width: gutter, height: heading)
          if allDayHeight > 0 {
            MongolianLabel(
              text: Copy.calendar("allDay"), height: allDayHeight - 10, size: 18, color: .secondary
            )
            .frame(width: gutter, height: allDayHeight, alignment: .top).padding(.top, 5)
          }
        }.background(skin.canvas)
      }.frame(width: gutter, height: geometry.size.height).clipped()
    }.accessibilityHidden(true)
  }
  private func timeHeading(columnWidth: CGFloat) -> some View {
    HStack(spacing: 0) {
      ForEach(days, id: \.self) { day in
        Button {
          model.select(day)
        } label: {
          HStack(spacing: 7) {
            if days.count > 1 {
              Text(String(Int(day.suffix(2))!)).font(.title3.monospacedDigit())
              MongolianLabel(text: Copy.weekdays[weekday(day)], height: 52, size: 18)
            } else {
              Text(day).font(.callout.monospacedDigit())
            }
            if model.showLunar, let lunar = model.engine?.lunar(day) {
              Text("\(lunar.month)/\(lunar.day)").font(.caption2.monospacedDigit()).foregroundStyle(
                .secondary)
            }
          }.frame(width: columnWidth, height: days.count > 1 ? 68 : 48)
            .foregroundStyle(day == model.date ? Color.accentColor : .primary)
        }.buttonStyle(.plain).accessibilityLabel(day)
          .disabled(day < "1901-01-01" || day > "2100-12-31")
      }
    }.overlay(alignment: .bottom) { Divider() }
  }
  private func allDayBand(_ layouts: [CalendarDayLayout], columnWidth: CGFloat) -> some View {
    HStack(alignment: .top, spacing: 0) {
      ForEach(Array(days.enumerated()), id: \.element) { index, day in
        ScrollView(.horizontal) {
          HStack(spacing: 3) {
            ForEach(layouts[index].allDay) { event in
              Button {
                onOpen(event)
              } label: {
                MongolianCalendarPreview(text: event.title, scale: scale, color: color(event))
                  .frame(width: 84 * CGFloat(scale), height: 84 * CGFloat(scale)).padding(5)
                  .background(color(event).opacity(0.1), in: RoundedRectangle(cornerRadius: 4))
              }.buttonStyle(.plain).accessibilityLabel(
                Copy.calendar("allDay") + " · " + event.title)
            }
            Button {
              onAdd(day, 540, true)
            } label: {
              Image(systemName: "plus").frame(width: 32, height: 44)
            }
            .buttonStyle(.plain).accessibilityLabel(
              Copy.calendar("add") + " · " + Copy.calendar("allDay")
            )
            .disabled(day < "1901-01-01" || day > "2100-12-31")
          }.padding(4)
        }.frame(width: columnWidth, height: 84 * CGFloat(scale) + 18)
      }
    }.overlay(alignment: .bottom) { Divider() }
  }
  private func timeColumn(_ day: String, layout: CalendarDayLayout, width: CGFloat) -> some View {
    ZStack(alignment: .topLeading) {
      VStack(spacing: 0) {
        ForEach(0..<48, id: \.self) { slot in
          Button {
            onAdd(day, slot * 30, false)
          } label: {
            Rectangle().fill(.clear).contentShape(Rectangle()).frame(height: hourHeight / 2)
          }.buttonStyle(.plain).accessibilityLabel(
            Copy.calendar("add") + " · " + day + " · " + clock(Double(slot * 30))
          )
          .id("calendar-scroll-\(day)-\(slot)")
          .accessibilityIdentifier("calendar-slot-\(day)-\(slot * 30)")
          .disabled(day < "1901-01-01" || day > "2100-12-31")
        }
      }
      ForEach(layout.timed) { item in
        let eventWidth = width / CGFloat(item.columns)
        let height = hourHeight * (item.visualEnd - item.start) / 60 - 3
        Button {
          onOpen(item.event)
        } label: {
          VStack(alignment: .leading, spacing: 3) {
            Text(clock(item.start)).font(.system(size: 10).monospacedDigit())
            MongolianCalendarPreview(text: item.event.title, scale: scale, color: color(item.event))
          }.padding(.horizontal, 7).padding(.vertical, 5)
            .frame(width: eventWidth - 4, height: height, alignment: .topLeading)
            .background(color(item.event).opacity(0.1), in: RoundedRectangle(cornerRadius: 5))
            .overlay(alignment: .topLeading) {
              RoundedRectangle(cornerRadius: 2).fill(color(item.event)).frame(
                width: 3, height: max(2, hourHeight * (item.end - item.start) / 60 - 2))
            }
        }.buttonStyle(.plain).foregroundStyle(color(item.event))
          .accessibilityLabel(item.event.title + " · " + clock(item.start) + "–" + clock(item.end))
          .accessibilityIdentifier("calendar-event-\(item.event.eventId ?? item.event.id)")
          .offset(x: CGFloat(item.column) * eventWidth + 2, y: hourHeight * item.start / 60)
      }
      if day == model.today {
        let minute =
          CivilCalendar.calendar.component(.hour, from: now) * 60
          + CivilCalendar.calendar.component(.minute, from: now)
        Rectangle().fill(skin == .ink ? Color.primary : .red).frame(height: 1)
          .overlay(alignment: .leading) {
            Circle().fill(skin == .ink ? Color.primary : .red).frame(width: 6, height: 6)
          }
          .offset(y: hourHeight * CGFloat(minute) / 60).allowsHitTesting(false).accessibilityHidden(
            true)
      }
    }.frame(width: width, height: hourHeight * 25, alignment: .topLeading)
      .overlay(alignment: .leading) {
        Rectangle().fill(Color.secondary.opacity(0.15)).frame(width: 0.5)
      }
  }
}
