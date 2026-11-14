package com.blurexample.texturevideo

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class TextureVideoViewManager : SimpleViewManager<TextureVideoView>() {
    override fun getName() = "TextureVideoView"

    override fun createViewInstance(context: ThemedReactContext) = TextureVideoView(context)

    @ReactProp(name = "paused", defaultBoolean = false)
    fun setPaused(view: TextureVideoView, paused: Boolean) = view.setPaused(paused)
}
