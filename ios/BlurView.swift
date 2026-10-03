import ExpoModulesCore
import UIKit
import QuartzCore

final class BlurEffectView: UIVisualEffectView {
  var intensity: Double = 0.5 {
    didSet { setNeedsDisplay() }
  }

  var style: UIBlurEffect.Style = .regular {
    didSet {
      visualEffect = UIBlurEffect(style: style)
    }
  }

  private var visualEffect: UIVisualEffect = UIBlurEffect(style: .regular) {
    didSet { setNeedsDisplay() }
  }

  private var animator: UIViewPropertyAnimator?

  init() {
    super.init(effect: nil)
  }

  required init?(coder aDecoder: NSCoder) { nil }

  deinit {
    animator?.stopAnimation(true)
  }

  override func draw(_ rect: CGRect) {
    super.draw(rect)

    effect = nil
    animator?.stopAnimation(true)
    animator = UIViewPropertyAnimator(duration: 1, curve: .linear) { [unowned self] in
      self.effect = visualEffect
    }
    animator?.fractionComplete = CGFloat(min(1.0, max(0.01, intensity)))
  }
}

public class BlurView: ExpoView {
  private let blurEffectView = BlurEffectView()
  private let tintOverlayView = UIView()
  private let specularBorderLayer = CAGradientLayer()
  private let borderShapeMask = CAShapeLayer()
  private var sdfHighlightLayer: CALayer?

  private var intensity: Double = 100.0
  private var tintStyleString: String = "glass"
  private var customTintColorString: String?
  private var cornerRadius: Double = 0.0

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    setupViews()
  }

  private func setupViews() {
    backgroundColor = .clear
    clipsToBounds = true
    isUserInteractionEnabled = false

    addSubview(blurEffectView)

    tintOverlayView.isUserInteractionEnabled = false
    addSubview(tintOverlayView)

    if let sdfLayer = GlassSDF.makeHighlightLayer() {
      layer.addSublayer(sdfLayer)
      sdfHighlightLayer = sdfLayer
    } else {
      specularBorderLayer.colors = [
        UIColor(white: 1.0, alpha: 0.45).cgColor,
        UIColor(white: 1.0, alpha: 0.15).cgColor,
        UIColor(white: 1.0, alpha: 0.05).cgColor
      ]
      specularBorderLayer.startPoint = CGPoint(x: 0.5, y: 0.0)
      specularBorderLayer.endPoint = CGPoint(x: 0.5, y: 1.0)

      borderShapeMask.fillColor = UIColor.clear.cgColor
      borderShapeMask.strokeColor = UIColor.white.cgColor
      borderShapeMask.lineWidth = 0.5
      specularBorderLayer.mask = borderShapeMask
      layer.addSublayer(specularBorderLayer)
    }

    applyBlur()
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    let b = bounds

    blurEffectView.frame = b
    tintOverlayView.frame = b

    if let sdfLayer = sdfHighlightLayer {
      GlassSDF.update(sdfLayer, bounds: b, cornerRadius: CGFloat(cornerRadius), intensity: intensity)
      return
    }

    specularBorderLayer.frame = b
    updateBorderPath()
  }

  private func updateBorderPath() {
    let insetBounds = bounds.insetBy(dx: 0.25, dy: 0.25)
    let radius = CGFloat(max(0.0, cornerRadius))
    let path = UIBezierPath(roundedRect: insetBounds, cornerRadius: radius)
    borderShapeMask.path = path.cgPath
    borderShapeMask.frame = bounds
  }

  public func setIntensity(_ intensity: Double) {
    self.intensity = max(0.0, min(100.0, intensity))
    applyBlur()
  }

  public func setTint(_ tint: String) {
    self.tintStyleString = tint
    applyBlur()
  }

  public func setTintColor(_ colorStr: String?) {
    self.customTintColorString = colorStr
    updateTintOverlay()
  }

  public func setBorderRadius(_ radius: Double) {
    self.cornerRadius = max(0.0, radius)
    layer.cornerRadius = CGFloat(self.cornerRadius)
    layer.cornerCurve = .continuous
    blurEffectView.layer.cornerRadius = CGFloat(self.cornerRadius)
    blurEffectView.layer.cornerCurve = .continuous
    updateBorderPath()
    setNeedsLayout()
  }

  private func applyBlur() {
    blurEffectView.style = resolveBlurStyle(from: tintStyleString)
    blurEffectView.intensity = intensity / 100.0
    blurEffectView.isHidden = intensity <= 0.0
    updateTintOverlay()

    if sdfHighlightLayer != nil {
      setNeedsLayout()
    }
  }

  private func updateTintOverlay() {
    tintOverlayView.backgroundColor = customTintColorString.flatMap(parseColor) ?? .clear
  }

  private func resolveBlurStyle(from tintName: String) -> UIBlurEffect.Style {
    switch tintName.lowercased() {
    case "light":
      return .light
    case "dark":
      return .dark
    case "extralight":
      return .extraLight
    case "prominent":
      return .prominent
    case "systemultrathinmaterial", "glass", "liquid":
      return .systemUltraThinMaterial
    case "systemthinmaterial":
      return .systemThinMaterial
    case "systemmaterial":
      return .systemMaterial
    case "systemthickmaterial":
      return .systemThickMaterial
    case "systemchromematerial":
      return .systemChromeMaterial
    default:
      return .regular
    }
  }

  private func parseColor(_ colorStr: String) -> UIColor? {
    let trimmed = colorStr.trimmingCharacters(in: .whitespacesAndNewlines)
    if trimmed.hasPrefix("#") {
      var hexInt: UInt64 = 0
      let scanner = Scanner(string: String(trimmed.dropFirst()))
      if scanner.scanHexInt64(&hexInt) {
        if trimmed.count == 7 {
          return UIColor(
            red: CGFloat((hexInt >> 16) & 0xFF) / 255.0,
            green: CGFloat((hexInt >> 8) & 0xFF) / 255.0,
            blue: CGFloat(hexInt & 0xFF) / 255.0,
            alpha: 1.0
          )
        } else if trimmed.count == 9 {
          return UIColor(
            red: CGFloat((hexInt >> 24) & 0xFF) / 255.0,
            green: CGFloat((hexInt >> 16) & 0xFF) / 255.0,
            blue: CGFloat((hexInt >> 8) & 0xFF) / 255.0,
            alpha: CGFloat(hexInt & 0xFF) / 255.0
          )
        }
      }
    }
    return nil
  }
}
