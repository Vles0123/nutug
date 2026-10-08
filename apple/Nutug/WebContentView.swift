import SwiftUI
import WebKit

private struct GraphNode: Encodable {
  let id: String
  let name: String
}
@MainActor
final class GraphCoordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
  var selected: Binding<String>
  let core: HistoryCore
  var lastPayload = ""
  init(selected: Binding<String>, core: HistoryCore) {
    self.selected = selected
    self.core = core
  }
  func payload(edges: [HistoryEdge]) -> String {
    let ids = Set([selected.wrappedValue] + edges.flatMap { [$0.from, $0.to] })
    let nodes = ids.sorted().compactMap { id in
      core.people[id].map { GraphNode(id: id, name: $0.name) }
    }
    struct Payload: Encodable {
      let nodes: [GraphNode]
      let edges: [HistoryEdge]
      let selected: String
    }
    let data = try? JSONEncoder().encode(
      Payload(nodes: nodes, edges: edges, selected: selected.wrappedValue))
    return data.flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
  }
  func make(edges: [HistoryEdge]) -> WKWebView {
    let config = WKWebViewConfiguration()
    config.userContentController.add(self, name: "nutugGraph")
    lastPayload = payload(edges: edges)
    config.userContentController.addUserScript(
      WKUserScript(
        source: "window.NutugGraph = \(lastPayload);", injectionTime: .atDocumentStart,
        forMainFrameOnly: true))
    let view = WKWebView(frame: .zero, configuration: config)
    view.navigationDelegate = self
    view.loadFileURL(
      AppModel.publicRoot.appendingPathComponent("index.html"),
      allowingReadAccessTo: AppModel.publicRoot)
    return view
  }
  func update(_ view: WKWebView, edges: [HistoryEdge]) {
    let value = payload(edges: edges)
    guard value != lastPayload else { return }
    lastPayload = value
    view.evaluateJavaScript("window.NutugGraphUpdate?.(\(value))")
  }
  func userContentController(
    _ controller: WKUserContentController, didReceive message: WKScriptMessage
  ) {
    guard let id = message.body as? String, core.people[id] != nil else { return }
    selected.wrappedValue = id
  }
  func webView(
    _ view: WKWebView, decidePolicyFor action: WKNavigationAction,
    decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
  ) {
    let url = action.request.url
    decisionHandler(
      url?.isFileURL == true
        && url!.standardizedFileURL.path.hasPrefix(
          AppModel.publicRoot.standardizedFileURL.path + "/")
        ? .allow : .cancel)
  }
}
#if os(macOS)
  struct NativeGraphView: NSViewRepresentable {
    let core: HistoryCore
    @Binding var selected: String
    let edges: [HistoryEdge]
    func makeCoordinator() -> GraphCoordinator { GraphCoordinator(selected: $selected, core: core) }
    func makeNSView(context: Context) -> WKWebView { context.coordinator.make(edges: edges) }
    func updateNSView(_ view: WKWebView, context: Context) {
      context.coordinator.selected = $selected
      context.coordinator.update(view, edges: edges)
    }
    static func dismantleNSView(_ view: WKWebView, coordinator: GraphCoordinator) {
      view.configuration.userContentController.removeScriptMessageHandler(forName: "nutugGraph")
      view.stopLoading()
    }
  }
#else
  struct NativeGraphView: UIViewRepresentable {
    let core: HistoryCore
    @Binding var selected: String
    let edges: [HistoryEdge]
    func makeCoordinator() -> GraphCoordinator { GraphCoordinator(selected: $selected, core: core) }
    func makeUIView(context: Context) -> WKWebView { context.coordinator.make(edges: edges) }
    func updateUIView(_ view: WKWebView, context: Context) {
      context.coordinator.selected = $selected
      context.coordinator.update(view, edges: edges)
    }
    static func dismantleUIView(_ view: WKWebView, coordinator: GraphCoordinator) {
      view.configuration.userContentController.removeScriptMessageHandler(forName: "nutugGraph")
      view.stopLoading()
    }
  }
#endif
