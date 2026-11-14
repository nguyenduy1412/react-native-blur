package com.blurexample.texturevideo

import android.content.Context
import android.graphics.Matrix
import android.graphics.SurfaceTexture
import android.media.MediaPlayer
import android.net.Uri
import android.view.Surface
import android.view.TextureView

/**
 * Plays res/raw/sample.mp4 into a TextureView (looping, muted, centre-cropped).
 * Test-only component: react-native-video 6.19 always uses a SurfaceView on
 * Android, so this is how the example exercises TextureView video.
 */
class TextureVideoView(context: Context) : TextureView(context), TextureView.SurfaceTextureListener {

    private var player: MediaPlayer? = null
    private var surface: Surface? = null
    private var paused = false
    private var sourceWidth = 0
    private var sourceHeight = 0

    init {
        surfaceTextureListener = this
    }

    fun setPaused(value: Boolean) {
        paused = value
        player?.let { if (value) it.pause() else if (!it.isPlaying) it.start() }
    }

    override fun onSurfaceTextureAvailable(texture: SurfaceTexture, width: Int, height: Int) {
        val output = Surface(texture).also { surface = it }
        val rawId = resources.getIdentifier("sample", "raw", context.packageName)
        player = MediaPlayer().apply {
            setDataSource(context, Uri.parse("android.resource://${context.packageName}/$rawId"))
            setSurface(output)
            isLooping = true
            setVolume(0f, 0f)
            setOnVideoSizeChangedListener { _, w, h ->
                sourceWidth = w
                sourceHeight = h
                applyCenterCrop()
            }
            setOnPreparedListener { if (!paused) it.start() }
            prepareAsync()
        }
    }

    override fun onSurfaceTextureSizeChanged(texture: SurfaceTexture, width: Int, height: Int) = applyCenterCrop()

    override fun onSurfaceTextureDestroyed(texture: SurfaceTexture): Boolean {
        player?.release()
        player = null
        surface?.release()
        surface = null
        return true
    }

    override fun onSurfaceTextureUpdated(texture: SurfaceTexture) = Unit

    private fun applyCenterCrop() {
        if (sourceWidth == 0 || sourceHeight == 0 || width == 0 || height == 0) return
        val viewRatio = width.toFloat() / height
        val videoRatio = sourceWidth.toFloat() / sourceHeight
        val scaleX = if (videoRatio > viewRatio) videoRatio / viewRatio else 1f
        val scaleY = if (videoRatio > viewRatio) 1f else viewRatio / videoRatio
        setTransform(Matrix().apply { setScale(scaleX, scaleY, width / 2f, height / 2f) })
    }
}
