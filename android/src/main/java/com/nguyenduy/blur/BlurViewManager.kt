package com.nguyenduy.blur

import android.view.View
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.NguyenduyBlurViewManagerDelegate
import com.facebook.react.viewmanagers.NguyenduyBlurViewManagerInterface

@ReactModule(name = BlurViewManager.NAME)
class BlurViewManager :
    ViewGroupManager<BlurView>(),
    NguyenduyBlurViewManagerInterface<BlurView> {

    private val delegate: ViewManagerDelegate<BlurView> = NguyenduyBlurViewManagerDelegate(this)

    override fun getDelegate(): ViewManagerDelegate<BlurView> = delegate

    override fun getName(): String = NAME

    override fun createViewInstance(context: ThemedReactContext): BlurView = BlurView(context)

    override fun addView(parent: BlurView, child: View, index: Int) {
        parent.blurContent.addView(child, index)
    }

    override fun getChildCount(parent: BlurView): Int = parent.blurContent.childCount

    override fun getChildAt(parent: BlurView, index: Int): View? = parent.blurContent.getChildAt(index)

    override fun removeViewAt(parent: BlurView, index: Int) {
        parent.blurContent.removeViewAt(index)
    }

    @ReactProp(name = "mode")
    override fun setMode(view: BlurView, value: String?) {
        view.setMode(value ?: "content")
    }

    @ReactProp(name = "intensity", defaultFloat = 50f)
    override fun setIntensity(view: BlurView, value: Float) {
        view.setIntensity(value.toDouble())
    }

    @ReactProp(name = "blurRadius", defaultFloat = 0f)
    override fun setBlurRadius(view: BlurView, value: Float) {
        view.setBlurRadius(value.toDouble())
    }

    @ReactProp(name = "saturation", defaultFloat = 1f)
    override fun setSaturation(view: BlurView, value: Float) {
        view.setSaturation(value.toDouble())
    }

    @ReactProp(name = "tint")
    override fun setTint(view: BlurView, value: String?) {
        view.setTint(value ?: "default")
    }

    @ReactProp(name = "tintColor", customType = "Color")
    override fun setTintColor(view: BlurView, value: Int?) {
        view.setTintColor(value)
    }

    @ReactProp(name = "syncVideo", defaultBoolean = true)
    override fun setSyncVideo(view: BlurView, value: Boolean) {
        view.setSyncVideo(value)
    }

    @ReactProp(name = "colorScheme")
    override fun setColorScheme(view: BlurView, value: String?) {
        view.setColorScheme(value)
    }

    @ReactProp(name = "cornerRadii")
    override fun setCornerRadii(view: BlurView, value: ReadableArray?) {
        val radii = value?.let { array -> (0 until array.size()).map { array.getDouble(it) } } ?: emptyList()
        view.setCornerRadii(radii)
    }

    companion object {
        const val NAME = "NguyenduyBlurView"
    }
}
