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
    // A paused animator can be finished by UIKit while the app is in the
    // background, which leaves the blur at full strength. Rebuild it.
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(rebuildEffect),
      name: UIApplication.willEnterForegroundNotification,
      object: nil
    )
  }

  required init?(coder aDecoder: NSCoder) { nil }

  deinit {
    NotificationCenter.default.removeObserver(self)
    animator?.stopAnimation(true)
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    // The animator is also torn down when the view leaves the window, for
    // example during a navigation transition.
    if window != nil { rebuildEffect() }
  }

  @objc private func rebuildEffect() {
    setNeedsDisplay()
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

@objc(NguyenduyBlurNativeView)
public class BlurView: UIView {
  private let blurEffectView = BlurEffectView()
  private let tintOverlayView = UIView()
  private let specularBorderLayer = CAGradientLayer()
  private let borderShapeMask = CAShapeLayer()
  private var sdfHighlightLayer: CALayer?

  private var intensity: Double = 50.0
  private var tintStyleString: String = "default"
  // Top-left, top-right, bottom-right, bottom-left, in points.
  private var cornerRadii: [CGFloat] = [0, 0, 0, 0]

  @objc public override init(frame: CGRect) {
    super.init(frame: frame)
    setupViews()
  }

  public required init?(coder: NSCoder) {
    super.init(coder: coder)
    setupViews()
  }

  private func setupViews() {
    backgroundColor = .clear
    clipsToBounds = true
    isUserInteractionEnabled = false

    addSubview(blurEffectView)

    tintOverlayView.isUserInteractionEnabled = false
    addSubview(tintOverlayView)

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

    if let sdfLayer = GlassSDF.makeHighlightLayer() {
      layer.addSublayer(sdfLayer)
      sdfHighlightLayer = sdfLayer
    }

    layer.cornerCurve = .continuous
    blurEffectView.layer.cornerCurve = .continuous

    applyBlur()
  }

  private var hasUniformCorners: Bool {
    cornerRadii.allSatisfy { $0 == cornerRadii[0] }
  }

  private func clampedRadius(_ radius: CGFloat) -> CGFloat {
    min(radius, min(bounds.width, bounds.height) / 2)
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    let b = bounds

    blurEffectView.frame = b
    tintOverlayView.frame = b

    // Uniform corners use the layer's continuous corner curve. Other shapes
    // are clipped by the React Native container (overflow: hidden), and only
    // the rim needs the exact path.
    let uniformRadius = hasUniformCorners ? clampedRadius(cornerRadii[0]) : 0
    layer.cornerRadius = uniformRadius
    blurEffectView.layer.cornerRadius = uniformRadius

    let useSDF = sdfHighlightLayer != nil && hasUniformCorners
    let rimVisible = intensity > 0
    sdfHighlightLayer?.isHidden = !useSDF || !rimVisible
    specularBorderLayer.isHidden = useSDF || !rimVisible
    if let sdfLayer = sdfHighlightLayer, useSDF {
      GlassSDF.update(sdfLayer, bounds: b, cornerRadius: uniformRadius, intensity: intensity)
      return
    }

    CATransaction.begin()
    CATransaction.setDisableActions(true)
    specularBorderLayer.frame = b
    specularBorderLayer.opacity = Float(max(0.0, min(1.0, intensity / 100.0)))
    borderShapeMask.frame = b
    borderShapeMask.path = borderPath(in: b.insetBy(dx: 0.25, dy: 0.25)).cgPath
    CATransaction.commit()
  }

  private func borderPath(in rect: CGRect) -> UIBezierPath {
    if hasUniformCorners {
      return UIBezierPath(roundedRect: rect, cornerRadius: clampedRadius(cornerRadii[0]))
    }
    let tl = clampedRadius(cornerRadii[0])
    let tr = clampedRadius(cornerRadii[1])
    let br = clampedRadius(cornerRadii[2])
    let bl = clampedRadius(cornerRadii[3])
    let path = UIBezierPath()
    path.move(to: CGPoint(x: rect.minX + tl, y: rect.minY))
    path.addLine(to: CGPoint(x: rect.maxX - tr, y: rect.minY))
    path.addArc(withCenter: CGPoint(x: rect.maxX - tr, y: rect.minY + tr), radius: tr, startAngle: -.pi / 2, endAngle: 0, clockwise: true)
    path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - br))
    path.addArc(withCenter: CGPoint(x: rect.maxX - br, y: rect.maxY - br), radius: br, startAngle: 0, endAngle: .pi / 2, clockwise: true)
    path.addLine(to: CGPoint(x: rect.minX + bl, y: rect.maxY))
    path.addArc(withCenter: CGPoint(x: rect.minX + bl, y: rect.maxY - bl), radius: bl, startAngle: .pi / 2, endAngle: .pi, clockwise: true)
    path.addLine(to: CGPoint(x: rect.minX, y: rect.minY + tl))
    path.addArc(withCenter: CGPoint(x: rect.minX + tl, y: rect.minY + tl), radius: tl, startAngle: .pi, endAngle: .pi * 1.5, clockwise: true)
    path.close()
    return path
  }

  @objc public func setIntensity(_ intensity: Double) {
    self.intensity = max(0.0, min(100.0, intensity))
    applyBlur()
  }

  @objc public func setTint(_ tint: String) {
    self.tintStyleString = tint
    applyBlur()
  }

  @objc(setBlurTintColor:) public func setTintColor(_ color: UIColor?) {
    tintOverlayView.backgroundColor = color ?? .clear
  }

  @objc public func setCornerRadii(_ radii: [NSNumber]) {
    let values = radii.map { CGFloat(max(0.0, $0.doubleValue)) }
    cornerRadii = values.count == 4 ? values : [values.first ?? 0, values.first ?? 0, values.first ?? 0, values.first ?? 0]
    setNeedsLayout()
  }

  private func applyBlur() {
    blurEffectView.style = resolveBlurStyle(from: tintStyleString)
    blurEffectView.intensity = intensity / 100.0
    blurEffectView.isHidden = intensity <= 0.0
    setNeedsLayout()
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
}
