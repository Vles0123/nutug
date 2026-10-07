import SwiftUI

struct NativeHistory: View {
  @ObservedObject var store: HistoryStore
  let scale: Double
  @State private var selected: String?
  @State private var chosenPerson: PersonSelection?
  @State private var periods = false
  @Environment(\.scenePhase) private var phase
  private var events: [HistoryEvent] { store.content?.events ?? [] }
  private var index: Int { events.firstIndex { $0.id == selected } ?? 0 }
  var body: some View {
    Group {
      if let core = store.content, !events.isEmpty {
        VStack(spacing: 16) {
          HStack {
            Button {
              if index > 0 { selected = events[index - 1].id }
            } label: {
              Image(systemName: "chevron.left")
            }.disabled(index == 0).accessibilityLabel(Copy.label("previous"))
            Button {
              periods = true
            } label: {
              Text("\(index+1) / \(events.count)").monospacedDigit()
            }.accessibilityLabel(Copy.label("timeline"))
            Button {
              if index + 1 < events.count { selected = events[index + 1].id }
            } label: {
              Image(systemName: "chevron.right")
            }.disabled(index + 1 == events.count).accessibilityLabel(Copy.label("next"))
            Spacer()
            Button {
              Task { await store.refresh() }
            } label: {
              Image(
                systemName: store.updateAvailable
                  ? "arrow.clockwise.circle.fill" : "arrow.clockwise")
            }.disabled(store.loading).accessibilityLabel(Copy.label("update"))
          }.buttonStyle(.bordered).padding(.horizontal)
          GeometryReader { geometry in
            let event = events[index]
            let height = max(240, geometry.size.height - 32)
            ScrollView(.horizontal) {
              HStack(alignment: .top, spacing: 28) {
                VStack(alignment: .leading, spacing: 20) {
                  if event.precision != "period" {
                    Text(event.date).font(.largeTitle.monospacedDigit()).foregroundStyle(
                      Color.accentColor)
                  }
                  MongolianText(text: event.title, height: height - 65, size: 33, scale: scale)
                }
                if event.precision == "period" {
                  MongolianText(text: event.date, height: height, size: 23, scale: scale)
                }
                MongolianText(text: event.text, height: height, size: 28, scale: scale)
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
    .task { await store.load() }
    .onChange(of: phase) { _, phase in if phase == .active { Task { await store.load() } } }
    .sheet(isPresented: $periods) {
      NavigationStack {
        List(events) { event in
          Button {
            selected = event.id
            periods = false
          } label: {
            HStack(alignment: .top, spacing: 24) {
              Text(event.precision == "period" ? "" : event.date).monospacedDigit().frame(width: 96)
              MongolianText(text: event.title, height: 160, size: 24)
            }
          }.buttonStyle(.plain)
        }.listStyle(.plain)
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
private struct NativePerson: View {
  let core: HistoryCore
  let scale: Double
  @State private var selected: String
  @State private var family = true
  @Environment(\.dismiss) private var dismiss
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
  var body: some View {
    NavigationStack {
      Group {
        if let person = core.people[selected] {
          ScrollView {
            VStack(spacing: 24) {
              ScrollView(.horizontal) {
                HStack(alignment: .top, spacing: 24) {
                  MongolianText(text: person.name, height: 220, size: 32, scale: scale)
                  MongolianText(text: person.summary, height: 240, size: 26, scale: scale)
                  NativeSources(ids: person.sources, sources: core.sources, scale: scale)
                }.padding()
              }
              Picker(Copy.label("relations"), selection: $family) {
                Image(systemName: "person.2").accessibilityLabel(Copy.label("family")).tag(true)
                Image(systemName: "point.3.connected.trianglepath.dotted").accessibilityLabel(
                  Copy.label("power")
                ).tag(false)
              }.pickerStyle(.segmented).padding(.horizontal)
              NativeGraphView(core: core, selected: $selected, edges: edges).frame(height: 400)
              ScrollView(.horizontal) {
                HStack(alignment: .top, spacing: 20) {
                  ForEach(edges) { edge in
                    let id = edge.from == selected ? edge.to : edge.from
                    if let other = core.people[id] {
                      Button {
                        selected = id
                      } label: {
                        HStack(alignment: .top) {
                          MongolianText(text: edge.label, height: 140, size: 20)
                          MongolianText(text: other.name, height: 140, size: 25)
                        }
                      }.buttonStyle(.bordered)
                    }
                  }
                }.padding()
              }
            }
          }
        }
      }
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button {
            dismiss()
          } label: {
            Image(systemName: "xmark")
          }.accessibilityLabel(Copy.label("close"))
        }
      }
    }
    #if os(macOS)
      .frame(width: 840, height: 740)
    #endif
  }
}
