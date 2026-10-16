import Foundation

enum MongolianOrthography {
  private static let words = try! NSRegularExpression(
    pattern: "[\\u034F\\u180B-\\u180F\\u1820-\\u18AA\\u200C\\u200D]+")
  static func display(_ text: String, registry: [[String: String]]) -> String {
    let mapping = Dictionary(
      uniqueKeysWithValues: registry.compactMap { row -> (String, String)? in
        guard let canonical = row["canonical"], let display = row["display"] else { return nil }
        return (canonical, display)
      })
    let original = text as NSString
    let output = NSMutableString(string: text)
    for match in words.matches(in: text, range: NSRange(location: 0, length: original.length))
      .reversed()
    {
      if let replacement = mapping[original.substring(with: match.range)] {
        output.replaceCharacters(in: match.range, with: replacement)
      }
    }
    return output as String
  }
}
