import Foundation
import UIKit
import ObjectiveC.runtime

enum GlassIntrospect {
  static let effectClassNames = [
    "CASDFGlassDisplacementEffect",
    "CASDFGlassHighlightEffect",
    "CASDFShadowEffect",
    "CASDFGradientContourEffect",
    "CASDFKeyFillHighlightEffect",
    "CASDFFillEffect",
    "CASDFOutputEffect",
    "CASDFGradientEffect",
  ]

  static func dump() -> [String: Any] {
    var report: [String: Any] = [:]
    for name in effectClassNames {
      guard let cls = NSClassFromString(name) else { continue }
      report[name] = [
        "properties": propertyNames(cls),
        "accessors": accessorNames(cls),
        "defaults": defaultValues(cls),
      ]
    }
    report["UIGlass"] = glassObjectDump()
    return report
  }

  private static func propertyNames(_ cls: AnyClass) -> [String] {
    var count: UInt32 = 0
    guard let list = class_copyPropertyList(cls, &count) else { return [] }
    defer { free(list) }
    return (0 ..< Int(count)).map { String(cString: property_getName(list[$0])) }
  }

  private static func accessorNames(_ cls: AnyClass) -> [String] {
    var count: UInt32 = 0
    guard let list = class_copyMethodList(cls, &count) else { return [] }
    defer { free(list) }
    return (0 ..< Int(count))
      .map { NSStringFromSelector(method_getName(list[$0])) }
      .filter { !$0.hasPrefix(".") }
      .sorted()
  }

  private static func defaultValues(_ cls: AnyClass) -> [String: String] {
    let selector = Selector(("defaultValues"))
    guard cls.responds(to: selector),
          let raw = (cls as AnyObject).perform(selector)?.takeUnretainedValue() as? [AnyHashable: Any]
    else { return [:] }
    return raw.reduce(into: [:]) { $0["\($1.key)"] = String(describing: $1.value) }
  }

  private static func glassObjectDump() -> [String: Any] {
    guard #available(iOS 26.0, *),
          let glass = UIGlassEffect(style: .regular).value(forKey: "glass") as? NSObject
    else { return [:] }
    let cls: AnyClass = type(of: glass)
    let names = propertyNames(cls)
    return [
      "class": NSStringFromClass(cls),
      "properties": names,
      "accessors": accessorNames(cls),
      "defaults": names.reduce(into: [String: String]()) { accumulated, key in
        accumulated[key] = String(describing: glass.value(forKey: key) ?? "nil")
      },
    ]
  }
}
