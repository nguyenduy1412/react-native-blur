import Foundation
import QuartzCore

var failures: [String] = []

func expect(_ condition: Bool, _ message: String) {
  if !condition { failures.append(message) }
}

func defaults(_ className: String) -> [AnyHashable: Any] {
  guard let cls = NSClassFromString(className) else { return [:] }
  let selector = Selector(("defaultValues"))
  guard cls.responds(to: selector) else { return [:] }
  return (cls as AnyObject).perform(selector)?.takeUnretainedValue() as? [AnyHashable: Any] ?? [:]
}

for name in ["CASDFLayer", "CASDFElementLayer", "CASDFGlassHighlightEffect", "CASDFGlassDisplacementEffect"] {
  expect(NSClassFromString(name) != nil, "missing class \(name)")
}

let highlight = defaults("CASDFGlassHighlightEffect")
expect((highlight["angle"] as? Double) == Double.pi / 2, "highlight angle drifted: \(highlight["angle"] ?? "nil")")
expect((highlight["spread"] as? Double) == Double.pi, "highlight spread drifted: \(highlight["spread"] ?? "nil")")
expect((highlight["amount"] as? Double) == 0.5, "highlight amount drifted: \(highlight["amount"] ?? "nil")")
expect((highlight["height"] as? Double) == 20, "highlight height drifted: \(highlight["height"] ?? "nil")")
expect((highlight["curvature"] as? Double) == 1, "highlight curvature drifted: \(highlight["curvature"] ?? "nil")")

let displacement = defaults("CASDFGlassDisplacementEffect")
expect((displacement["angle"] as? Double) == 0, "displacement angle drifted: \(displacement["angle"] ?? "nil")")
expect((displacement["curvature"] as? Double) == 1, "displacement curvature drifted: \(displacement["curvature"] ?? "nil")")
expect((displacement["height"] as? Double) == 20, "displacement height drifted: \(displacement["height"] ?? "nil")")

if let elementClass = NSClassFromString("CASDFElementLayer") as? CALayer.Type {
  let element = elementClass.init()
  expect(element.value(forKey: "mode") as? String == "bounds", "element mode default is no longer bounds")
  expect(element.value(forKey: "operation") as? String == "union", "element operation default is no longer union")
}

if failures.isEmpty {
  print("ok: GlassSDF constants match the running OS")
} else {
  failures.forEach { print("FAIL: \($0)") }
  exit(1)
}
