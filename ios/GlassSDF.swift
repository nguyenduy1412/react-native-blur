import UIKit
import QuartzCore

enum GlassSDF {
  static let appleHighlightAngle = Double.pi / 2
  static let appleHighlightSpread = Double.pi
  static let appleHighlightAmount = 0.5
  static let appleCurvature = 1.0
  static let appleHeight = 20.0

  static var isAvailable: Bool {
    NSClassFromString("CASDFLayer") != nil && NSClassFromString("CASDFGlassHighlightEffect") != nil
  }

  static func makeHighlightLayer() -> CALayer? {
    guard let containerClass = NSClassFromString("CASDFLayer") as? CALayer.Type,
          let elementClass = NSClassFromString("CASDFElementLayer") as? CALayer.Type,
          let effectClass = NSClassFromString("CASDFGlassHighlightEffect") as? NSObject.Type
    else { return nil }

    let container = containerClass.init()
    container.setValue("bounds", forKey: "mode")

    let element = elementClass.init()
    element.setValue("bounds", forKey: "mode")
    element.setValue("union", forKey: "operation")
    container.addSublayer(element)

    let effect = effectClass.init()
    effect.setValue(appleHighlightAngle, forKey: "angle")
    effect.setValue(appleHighlightSpread, forKey: "spread")
    effect.setValue(appleHighlightAmount, forKey: "amount")
    effect.setValue(appleCurvature, forKey: "curvature")
    effect.setValue(appleHeight, forKey: "height")
    effect.setValue(UIColor.white.cgColor, forKey: "color")
    container.setValue(effect, forKey: "effect")

    return container
  }

  static func makeDisplacementEffect() -> NSObject? {
    guard let effectClass = NSClassFromString("CASDFGlassDisplacementEffect") as? NSObject.Type else { return nil }
    let effect = effectClass.init()
    effect.setValue(0.0, forKey: "angle")
    effect.setValue(appleCurvature, forKey: "curvature")
    effect.setValue(appleHeight, forKey: "height")
    return effect
  }

  static func update(_ container: CALayer, bounds: CGRect, cornerRadius: CGFloat, intensity: Double) {
    container.frame = bounds
    container.sublayers?.first.map {
      $0.frame = bounds
      $0.cornerRadius = cornerRadius
      $0.cornerCurve = .continuous
    }
    guard let effect = container.value(forKey: "effect") as? NSObject else { return }
    effect.setValue(appleHighlightAmount * max(0.0, min(1.0, intensity / 100.0)), forKey: "amount")
    effect.setValue(min(appleHeight, max(1.0, Double(cornerRadius))), forKey: "height")
  }
}
