import SwiftUI
import WebKit

@MainActor
final class TextInputCoordinator: NSObject, WKScriptMessageHandler {
  var text: Binding<String>
  var lastValue: String
  var lastFocusRequest = 0
  init(text: Binding<String>) {
    self.text = text
    lastValue = text.wrappedValue
  }
  func make(label: String) -> WKWebView {
    let config = WKWebViewConfiguration()
    config.userContentController.add(self, name: "nutugText")
    let encoded = String(data: try! JSONEncoder().encode(lastValue), encoding: .utf8)!
    let title = String(data: try! JSONEncoder().encode(label), encoding: .utf8)!
    config.userContentController.addUserScript(
      WKUserScript(
        source: "window.initialValue=\(encoded);window.inputLabel=\(title);",
        injectionTime: .atDocumentStart, forMainFrameOnly: true))
    let view = WKWebView(frame: .zero, configuration: config)
    view.loadFileURL(
      AppModel.publicRoot.appendingPathComponent("text-input.html"),
      allowingReadAccessTo: AppModel.publicRoot)
    return view
  }
  func update(_ view: WKWebView, focusRequest: Int) {
    if focusRequest > 0 && lastFocusRequest != focusRequest {
      view.callAsyncJavaScript(
        "document.getElementById('input')?.focus()", arguments: [:], in: nil, in: .page)
    }
    lastFocusRequest = focusRequest
    guard lastValue != text.wrappedValue else { return }
    lastValue = text.wrappedValue
    view.callAsyncJavaScript(
      "window.setText?.(value)", arguments: ["value": lastValue], in: nil, in: .page)
  }
  func userContentController(
    _ userContentController: WKUserContentController, didReceive message: WKScriptMessage
  ) {
    guard let value = message.body as? String else { return }
    lastValue = value
    text.wrappedValue = value
  }
}
#if os(macOS)
  struct MongolianTextInput: NSViewRepresentable {
    @Binding var text: String
    let label: String
    var focusRequest: Int = 0
    func makeCoordinator() -> TextInputCoordinator { TextInputCoordinator(text: $text) }
    func makeNSView(context: Context) -> WKWebView { context.coordinator.make(label: label) }
    func updateNSView(_ view: WKWebView, context: Context) {
      context.coordinator.text = $text
      context.coordinator.update(view, focusRequest: focusRequest)
    }
    static func dismantleNSView(_ view: WKWebView, coordinator: TextInputCoordinator) {
      view.configuration.userContentController.removeScriptMessageHandler(forName: "nutugText")
      view.stopLoading()
    }
  }
#else
  struct MongolianTextInput: UIViewRepresentable {
    @Binding var text: String
    let label: String
    var focusRequest: Int = 0
    func makeCoordinator() -> TextInputCoordinator { TextInputCoordinator(text: $text) }
    func makeUIView(context: Context) -> WKWebView { context.coordinator.make(label: label) }
    func updateUIView(_ view: WKWebView, context: Context) {
      context.coordinator.text = $text
      context.coordinator.update(view, focusRequest: focusRequest)
    }
    static func dismantleUIView(_ view: WKWebView, coordinator: TextInputCoordinator) {
      view.configuration.userContentController.removeScriptMessageHandler(forName: "nutugText")
      view.stopLoading()
    }
  }
#endif
