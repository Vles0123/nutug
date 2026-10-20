import SwiftUI

struct NativeHistory: View {
  @ObservedObject var store: HistoryStore
  let scale: Double
  var onSettings: (() -> Void)? = nil
  @State private var selected: String?
  @State private var chosenPerson: PersonSelection?
  @State private var periods = false
  @State private var periodID: String?
  @Environment(\.scenePhase) private var phase
  private var events: [HistoryEvent] {
    (store.content?.events ?? []).sorted { ($0.startYear ?? 0, $0.id) < ($1.startYear ?? 0, $1.id) }
  }
  private var index: Int { events.firstIndex { $0.id == selected } ?? 0 }
  var body: some View {
    Group {
      if let core = store.content, !events.isEmpty {
        VStack(spacing: 16) {
          #if os(macOS)
            historyNavigation
          #endif
          GeometryReader { geometry in
            let event = events[index]
            let height = max(240, geometry.size.height - 32)
            ScrollView(.horizontal) {
              HStack(alignment: .top, spacing: 28) {
                VStack(alignment: .leading, spacing: 20) {
                  if !event.hasScriptedDate {
                    Text(event.date).font(.largeTitle.monospacedDigit()).foregroundStyle(
                      Color.accentColor)
                  }
                  MongolianText(text: event.title, height: height - 65, size: 33, scale: scale)
                }
                if event.hasScriptedDate {
                  MongolianText(text: event.date, height: height, size: 23, scale: scale)
                }
                MongolianText(text: event.text, height: height, size: 28, scale: scale)
                if !event.people.isEmpty {
                  Divider()
                  MongolianText(text: Copy.label("people"), height: 130, size: 23)
                  ForEach(event.people, id: \.self) { id in
                    if let person = core.people[id] {
                      Button {
                        chosenPerson = PersonSelection(id: id)
                      } label: {
                        MongolianText(text: person.name, height: 170, size: 25, scale: scale)
                      }.buttonStyle(.bordered)
                    }
                  }
                }
                NativeSources(ids: event.sources, sources: core.sources, scale: scale)
              }.padding()
            }.id(event.id)
          }
        }
        .sheet(item: $chosenPerson) { person in
          NativePerson(id: person.id, core: core, scale: scale)
        }
      } else if store.loading {
        ProgressView().accessibilityLabel(Copy.label("chronicle"))
      } else {
        Button {
          Task { await store.load() }
        } label: {
          MongolianText(text: Copy.label("retry"), height: 130, size: 25)
        }.buttonStyle(.bordered)
      }
    }
    #if os(iOS)
      .safeAreaInset(edge: .bottom, spacing: 0) { historyNavigation.background(.bar) }
    #endif
    .task { await store.load() }
    .onChange(of: phase) { _, phase in if phase == .active { Task { await store.load() } } }
    .sheet(isPresented: $periods) {
      NavigationStack {
        VStack {
          ScrollView(.horizontal) {
            HStack(alignment: .top, spacing: 12) {
              ForEach(store.content?.historyPeriods?.periods ?? []) { period in
                Button {
                  periodID = period.id
                } label: {
                  MongolianText(text: period.title, height: 130, size: 23)
                }
                .buttonStyle(.bordered).tint(periodID == period.id ? Color.accentColor : .secondary)
              }
            }.padding()
          }
          List(events.filter { periodID == nil || $0.periodId == periodID }) { event in
            Button {
              selected = event.id
              periods = false
            } label: {
              HStack(alignment: .top, spacing: 24) {
                Text(event.hasScriptedDate ? "" : event.date).monospacedDigit().frame(width: 96)
                MongolianText(text: event.title, height: 160, size: 24)
              }
            }.buttonStyle(.plain)
          }.listStyle(.plain)
        }
        .toolbar {
          ToolbarItem(placement: .cancellationAction) {
            Button {
              periods = false
            } label: {
              Image(systemName: "xmark")
            }.accessibilityLabel(Copy.label("close"))
          }
        }
      }
      #if os(macOS)
        .frame(width: 430, height: 620)
      #endif
    }
  }
  private var historyNavigation: some View {
    HStack {
      if !events.isEmpty {
        Button {
          if index > 0 { selected = events[index - 1].id }
        } label: {
          Image(systemName: "chevron.left")
        }.disabled(index == 0).accessibilityLabel(Copy.label("previous"))
        Button {
          periodID = events.indices.contains(index) ? events[index].periodId : nil
          periods = true
        } label: {
          Text("\(index+1) / \(events.count)").monospacedDigit()
        }.accessibilityLabel(Copy.label("timeline"))
        Button {
          if index + 1 < events.count { selected = events[index + 1].id }
        } label: {
          Image(systemName: "chevron.right")
        }.disabled(index + 1 >= events.count).accessibilityLabel(Copy.label("next"))
      }
      Spacer()
      Button {
        Task { await store.refresh() }
      } label: {
        Image(
          systemName: store.updateAvailable
            ? "arrow.clockwise.circle.fill" : "arrow.clockwise")
      }.disabled(store.loading).accessibilityLabel(Copy.label("update"))
      if let onSettings {
        Button(action: onSettings) { Image(systemName: "slider.horizontal.3") }
          .accessibilityLabel(Copy.label("settings"))
      }
    }.buttonStyle(.borderless).controlSize(.large).padding(.horizontal, 20).padding(.vertical, 12)
  }

}
private struct PersonSelection: Identifiable { let id: String }
private struct NativeSources: View {
  let ids: [String]
  let sources: [String: NutugSource]
  let scale: Double
  var body: some View {
    if !ids.isEmpty {
      Divider()
      MongolianText(text: Copy.label("sources"), height: 130, size: 23)
      ForEach(ids, id: \.self) { id in
        if let source = sources[id], let url = URL(string: source.url) {
          Link(destination: url) {
            VStack(spacing: 12) {
              Image(systemName: "arrow.up.right.square")
              MongolianText(text: source.displayTitle, height: 210, size: 23, scale: scale)
            }
          }
        }
      }
    }
  }
}
struct NativePerson: View {
  let core: HistoryCore
  let scale: Double
  @State private var selected: String
  @State private var family = true
  @State private var showRelations = false
  @State private var trail: [String] = []
  @Environment(\.dismiss) private var dismiss
  @Environment(\.dynamicTypeSize) private var typeSize
  init(id: String, core: HistoryCore, scale: Double) {
    self.core = core
    self.scale = scale
    _selected = State(initialValue: id)
  }
  private var edges: [HistoryEdge] {
    core.peopleEdges.filter {
      ($0.from == selected || $0.to == selected)
        && (family
          ? ["parent", "spouse"].contains($0.type) : !["parent", "spouse"].contains($0.type))
    }
  }
  private func follow(_ id: String) {
    guard id != selected else { return }
    trail.append(selected)
    selected = id
  }
  var body: some View {
    GeometryReader { geometry in
      if let person = core.people[selected] {
        VStack(spacing: 16) {
          ViewThatFits(in: .horizontal) {
            HStack(alignment: .top, spacing: 8) {
              MongolianText(text: person.name, height: 110, size: 30)
              Spacer(minLength: 0)
              personActions
            }
            VStack(alignment: .leading, spacing: 12) {
              MongolianText(text: person.name, height: 110, size: 30)
              personActions
            }
          }.buttonStyle(.bordered)
          if showRelations {
            HStack(spacing: 12) {
              HistoryChoice(label: Copy.label("family"), selected: family, height: 70) {
                family = true
              }
              HistoryChoice(label: Copy.label("power"), selected: !family, height: 70) {
                family = false
              }
              Spacer()
            }
            NativeGraphView(
              core: core, selected: Binding(get: { selected }, set: follow), edges: edges
            )
            .frame(
              width: max(1, geometry.size.width - 32), height: max(180, geometry.size.height - 264))
          } else {
            GeometryReader { reading in
              ScrollView(typeSize.isAccessibilitySize ? [.horizontal, .vertical] : .horizontal) {
                HStack(alignment: .top, spacing: 24) {
                  if let years = person.years {
                    MongolianText(
                      text: years, height: max(100, reading.size.height - 16), size: 23,
                      scale: scale)
                  }
                  MongolianText(
                    text: person.summary, height: max(100, reading.size.height - 16), size: 29,
                    scale: scale)
                  NativeSources(ids: person.sources, sources: core.sources, scale: scale)
                }.padding(8)
              }.id(selected)
            }
          }
        }.padding(16)
      }
    }
    #if os(macOS)
      .frame(width: 840, height: 740)
    #endif
  }
  private var personActions: some View {
    HStack(spacing: 8) {
      if !trail.isEmpty {
        Button {
          selected = trail.removeLast()
        } label: {
          Image(systemName: "arrow.left")
        }
        .accessibilityLabel(Copy.label("back"))
      }
      Button {
        showRelations = false
      } label: {
        Image(systemName: "text.alignleft")
      }
      .accessibilityLabel(Copy.label("details"))
      .tint(showRelations ? .secondary : .accentColor)
      Button {
        showRelations = true
      } label: {
        Image(systemName: "point.3.connected.trianglepath.dotted")
      }
      .accessibilityLabel(Copy.label("relations"))
      .tint(showRelations ? .accentColor : .secondary)
      Button {
        dismiss()
      } label: {
        Image(systemName: "xmark")
      }
      .accessibilityLabel(Copy.label("close"))
    }.controlSize(.large).dynamicTypeSize(...DynamicTypeSize.xxxLarge)
  }
}

private struct HistoryChoice: View {
  let label: String
  let selected: Bool
  var height: CGFloat = 90
  let action: () -> Void
  var body: some View {
    Button(action: action) {
      MongolianText(text: label, height: height, size: 22)
    }
    .buttonStyle(.bordered)
    .tint(selected ? .accentColor : .secondary)
    .accessibilityLabel(label)
    .accessibilityAddTraits(selected ? .isSelected : [])
  }
}
