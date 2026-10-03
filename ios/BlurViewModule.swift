import ExpoModulesCore

public class BlurViewModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BlurView")

    Function("dumpGlassInternals") { () -> [String: Any] in
      GlassIntrospect.dump()
    }

    View(BlurView.self) {
      Prop("intensity") { (view: BlurView, intensity: Double) in
        view.setIntensity(intensity)
      }
      Prop("tint") { (view: BlurView, tint: String) in
        view.setTint(tint)
      }
      Prop("tintColor") { (view: BlurView, tintColor: String?) in
        view.setTintColor(tintColor)
      }
      Prop("borderRadius") { (view: BlurView, radius: Double) in
        view.setBorderRadius(radius)
      }
    }
  }
}
