package com.nguyenduy.blur

import android.graphics.Canvas
import android.graphics.RenderEffect
import android.graphics.RenderNode
import android.os.Build
import android.view.View
import androidx.annotation.RequiresApi

/**
 * The parts of [BlurView] that differ between Android versions.
 *
 * - API 33+: [ModernBlurRenderer]
 * - API 31-32: [LegacyBlurRenderer], which works around Android 12 bugs
 * - Below API 31 there is no RenderEffect: [create] returns null and
 *   BlurView draws a translucent material plate instead of a blur.
 */
internal interface BlurRenderer {

    /** The node the backdrop is recorded into for this frame. */
    fun backdropNode(): RenderNode

    /** Applies [effect] to the content container in content mode; null clears it. */
    fun applyContentEffect(content: View, effect: RenderEffect?)

    /**
     * Draws the content in content mode. [record] draws the content into the
     * given canvas; [drawDefault] draws it the normal way (super.dispatchDraw).
     */
    fun drawContent(
        canvas: Canvas,
        width: Int,
        height: Int,
        effect: RenderEffect?,
        record: (Canvas) -> Unit,
        drawDefault: () -> Unit,
    )

    /**
     * Shows the blurred copy of a SurfaceView that sits inside a content-mode
     * BlurView. [effectApplied] is false while the content is not blurred.
     */
    fun showSurfaceCopy(mirror: SurfaceMirror, effectApplied: Boolean)

    /**
     * Downscale of a SurfaceView copy that covers the live video (backdrop
     * mode with syncVideo). 1 is full size.
     */
    val coverDownscale: Int

    companion object {
        fun create(): BlurRenderer? = when {
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU -> ModernBlurRenderer()
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> LegacyBlurRenderer()
            else -> null
        }
    }
}

/** API 33+. */
@RequiresApi(Build.VERSION_CODES.TIRAMISU)
internal class ModernBlurRenderer : BlurRenderer {

    private var node: RenderNode? = null

    override val coverDownscale = 1

    override fun backdropNode(): RenderNode =
        node ?: RenderNode("blurBackdrop").also { node = it }

    override fun applyContentEffect(content: View, effect: RenderEffect?) {
        content.setRenderEffect(effect)
    }

    override fun drawContent(
        canvas: Canvas,
        width: Int,
        height: Int,
        effect: RenderEffect?,
        record: (Canvas) -> Unit,
        drawDefault: () -> Unit,
    ) = drawDefault()

    // The SurfaceView is hidden (alpha 0) so its sharp video does not show
    // through; the copy in its overlay is still drawn.
    override fun showSurfaceCopy(mirror: SurfaceMirror, effectApplied: Boolean) {
        val shown = mirror.shown ?: return
        if (!effectApplied) {
            shown.alpha = 0
            return
        }
        val view = mirror.view
        if (mirror.ownerAlpha.isNaN() || view.alpha != 0f) {
            mirror.ownerAlpha = view.alpha
            view.alpha = 0f
        }
        shown.alpha = (mirror.ownerAlpha * 255).toInt()
    }
}

/**
 * API 31-32. Android 12 keeps the blurred layer of a RenderNode or view with
 * a RenderEffect when only its contents change, so a reused node froze the
 * backdrop while scrolling and a blurred video stayed on its first frame.
 * Every frame records into a fresh node instead.
 */
@RequiresApi(Build.VERSION_CODES.S)
internal class LegacyBlurRenderer : BlurRenderer {

    // Half size: a full-size copy took ~48 ms on API 31 against ~27 ms on
    // API 37. The covering copy is slightly softer than the live video.
    override val coverDownscale = 2

    override fun backdropNode(): RenderNode = RenderNode("blurBackdrop")

    // The effect is applied to a fresh node in drawContent instead.
    override fun applyContentEffect(content: View, effect: RenderEffect?) {
        content.setRenderEffect(null)
    }

    override fun drawContent(
        canvas: Canvas,
        width: Int,
        height: Int,
        effect: RenderEffect?,
        record: (Canvas) -> Unit,
        drawDefault: () -> Unit,
    ) {
        if (effect == null || !canvas.isHardwareAccelerated || width <= 0 || height <= 0) {
            drawDefault()
            return
        }
        val node = RenderNode("blurContent")
        node.setPosition(0, 0, width, height)
        val recording = node.beginRecording(width, height)
        try {
            record(recording)
        } finally {
            node.endRecording()
        }
        node.setRenderEffect(effect)
        canvas.drawRenderNode(node)
    }

    // Hiding the SurfaceView (alpha 0) hides its overlay too on Android 12,
    // and a SurfaceView that is not drawn stops receiving video frames. It
    // stays visible; the opaque copy drawn over it inside the blurred layer
    // covers the sharp video.
    override fun showSurfaceCopy(mirror: SurfaceMirror, effectApplied: Boolean) {
        val shown = mirror.shown ?: return
        shown.alpha = if (effectApplied) (mirror.view.alpha * 255).toInt() else 0
    }
}
