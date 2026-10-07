import CoreText
import SwiftUI

#if os(macOS)
  import AppKit
#else
  import UIKit
#endif

private enum MongolianTypesetting {
  static let name = "Onon Sonin Sans"
  static let graphicsFont: CGFont? = {
    let url = AppModel.publicRoot.appendingPathComponent("fonts/OnonSoninSans.ttf")
    guard let provider = CGDataProvider(url: url as CFURL) else { return nil }
    return CGFont(provider)
  }()
  static func registerFont() {
    let url = AppModel.publicRoot.appendingPathComponent("fonts/OnonSoninSans.ttf")
    CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
  }
  static func attributed(_ text: String, size: CGFloat, color: CGColor) -> NSAttributedString {
    let font =
      graphicsFont.map { CTFontCreateWithGraphicsFont($0, size, nil, nil) }
      ?? CTFontCreateWithName(name as CFString, size, nil)
    return NSAttributedString(
      string: Copy.display(text),
      attributes: [
        NSAttributedString.Key(kCTFontAttributeName as String): font,
        NSAttributedString.Key(kCTForegroundColorAttributeName as String): color,
      ])
  }
  static func lines(_ text: NSAttributedString, height: CGFloat) -> [CTLine] {
    let setter = CTFramesetterCreateWithAttributedString(text)
    let path = CGPath(
      rect: CGRect(x: 0, y: 0, width: max(20, height - 12), height: 100000), transform: nil)
    let frame = CTFramesetterCreateFrame(setter, CFRange(location: 0, length: 0), path, nil)
    return CTFrameGetLines(frame) as! [CTLine]
  }
  static func width(_ text: String, height: CGFloat, size: CGFloat) -> CGFloat {
    let value = attributed(text, size: size, color: CGColor(gray: 0, alpha: 1))
    return CGFloat(max(1, lines(value, height: height).count)) * size * 1.65 + 12
  }
  static func draw(_ text: String, size: CGFloat, rect: CGRect, color: CGColor, context: CGContext)
  {
    let value = attributed(text, size: size, color: color)
    // Shape complete Mongolian runs, then turn each line into a left-to-right column.
    for (column, line) in lines(value, height: rect.height).enumerated() {
      context.saveGState()
      context.textMatrix = .identity
      context.translateBy(x: 6 + CGFloat(column) * size * 1.65 + size * 0.35, y: rect.height - 6)
      context.rotate(by: -.pi / 2)
      context.textPosition = .zero
      CTLineDraw(line, context)
      context.restoreGState()
    }
  }
}

struct MongolianText: View {
  let text: String
  var height: CGFloat = 300
  var size: CGFloat = 28
  var scale: Double = 1
  @ScaledMetric(relativeTo: .body) private var dynamicScale: CGFloat = 1
  var body: some View {
    let fontSize = size * scale * dynamicScale
    let width = MongolianTypesetting.width(text, height: height, size: fontSize)
    MongolianDrawing(text: text, size: fontSize)
      .frame(width: width, height: height)
      .accessibilityElement(children: .ignore)
      .accessibilityLabel(Text(verbatim: text))
  }
  @MainActor static func registerFont() { MongolianTypesetting.registerFont() }
}

#if os(macOS)
  private struct MongolianDrawing: NSViewRepresentable {
    let text: String
    let size: CGFloat
    func makeNSView(context: Context) -> MongolianDrawingView { MongolianDrawingView() }
    func updateNSView(_ view: MongolianDrawingView, context: Context) {
      view.text = text
      view.size = size
      view.needsDisplay = true
    }
  }
  private final class MongolianDrawingView: NSView {
    var text = ""
    var size: CGFloat = 28
    override func draw(_ dirtyRect: NSRect) {
      guard let context = NSGraphicsContext.current?.cgContext else { return }
      context.textMatrix = .identity
      MongolianTypesetting.draw(
        text, size: size, rect: bounds, color: NSColor.labelColor.cgColor, context: context)
    }
  }
#else
  private struct MongolianDrawing: UIViewRepresentable {
    let text: String
    let size: CGFloat
    func makeUIView(context: Context) -> MongolianDrawingView {
      let view = MongolianDrawingView()
      view.backgroundColor = .clear
      return view
    }
    func updateUIView(_ view: MongolianDrawingView, context: Context) {
      view.text = text
      view.size = size
      view.setNeedsDisplay()
    }
  }
  private final class MongolianDrawingView: UIView {
    var text = ""
    var size: CGFloat = 28
    override func draw(_ rect: CGRect) {
      guard let context = UIGraphicsGetCurrentContext() else { return }
      context.textMatrix = .identity
      context.translateBy(x: 0, y: bounds.height)
      context.scaleBy(x: 1, y: -1)
      MongolianTypesetting.draw(
        text, size: size, rect: bounds,
        color: UIColor.label.resolvedColor(with: traitCollection).cgColor, context: context)
    }
  }
#endif
