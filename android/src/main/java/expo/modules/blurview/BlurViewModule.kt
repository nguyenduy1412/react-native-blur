package expo.modules.blurview

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class BlurViewModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("BlurView")

        View(BlurView::class) {
            Prop("intensity") { view: BlurView, intensity: Double ->
                view.setIntensity(intensity)
            }
            Prop("blurRadius") { view: BlurView, radius: Double ->
                view.setBlurRadius(radius)
            }
            Prop("saturation") { view: BlurView, saturation: Double ->
                view.setSaturation(saturation)
            }
            Prop("tint") { view: BlurView, tint: String ->
                view.setTint(tint)
            }
            Prop("tintColor") { view: BlurView, tintColor: String? ->
                view.setTintColor(tintColor)
            }
            Prop("borderRadius") { view: BlurView, radius: Double ->
                view.setBorderRadius(radius)
            }
        }
    }
}
