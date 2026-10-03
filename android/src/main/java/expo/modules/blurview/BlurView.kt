package expo.modules.blurview

import android.content.Context
import android.content.res.Configuration
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.LinearGradient
import android.graphics.Outline
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.RenderEffect
import android.graphics.Shader
import android.graphics.drawable.BitmapDrawable
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.Choreographer
import android.view.PixelCopy
import android.view.SurfaceView
import android.view.View
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import android.view.ViewTreeObserver
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

private class Material(
    val blurRadius: Float,
    val saturation: Float,
    val brightness: Float,
    val luminanceAmount: Float,
    val luminanceValues: FloatArray,
    val clampsBetweenStages: Boolean = false,
)

private val LIGHT_MATERIALS = mapOf(
    "ultrathin" to Material(22.5f, 1.1f, 0.12f, 0.5f, floatArrayOf(0.45f, 0.55f, 0.65f, 0.68f)),
    "thin" to Material(30f, 1.35f, 0.12f, 0.6f, floatArrayOf(0.725f, 0.825f, 0.76f, 0.73f)),
    "regular" to Material(30f, 1.5f, 0.1f, 0.75f, floatArrayOf(0.9f, 0.83f, 0.925f, 0.815f)),
    "thick" to Material(45f, 1.5f, 0.045f, 0.88f, floatArrayOf(0.99f, 0.95f, 0.98f, 0.905f)),
    "chrome" to Material(22.5f, 1.1f, 0.1f, 0.75f, floatArrayOf(0.8f, 0.9f, 1.1f, 0.825f)),
)

private val DARK_MATERIALS = mapOf(
    "ultrathin" to Material(22.5f, 1.1f, 0f, 0.5f, floatArrayOf(0.24f, 0.24f, 0.3f, 0.39f)),
    "thin" to Material(30f, 1.35f, 0f, 0.6f, floatArrayOf(0.2f, 0.21f, 0.1f, 0.15f)),
    "regular" to Material(30f, 1.5f, 0f, 0.75f, floatArrayOf(0.16f, 0.26f, 0.1f, 0.1f)),
    "thick" to Material(45f, 1.5f, 0f, 0.88f, floatArrayOf(0.14f, 0.16f, 0.1f, 0.03f)),
    "chrome" to Material(22.5f, 2f, -0.1f, 0.75f, floatArrayOf(0.23f, 0.52f, 0.27f, 0.255f)),
)

private val LEGACY_LIGHT = Material(30f, 1.8f, 0f, 0.3f, floatArrayOf(1f), true)
private val LEGACY_EXTRA_LIGHT = Material(20f, 1.8f, 0f, 0.8f, floatArrayOf(0.970588f), true)
private val LEGACY_DARK = Material(20f, 1.8f, 0f, 0.729412f, floatArrayOf(0.107527f), true)

private const val LUMA_R = 0.213f
private const val LUMA_G = 0.715f
private const val LUMA_B = 0.072f
private const val SKIA_RADIUS_TO_SIGMA = 0.57735f
private const val SURFACE_MIRROR_DOWNSCALE = 4
private const val SURFACE_MIRROR_INTERVAL_NANOS = 33_000_000L

private class SurfaceMirror(val view: SurfaceView) {
    val frames = arrayOfNulls<BitmapDrawable>(2)
    var next = 0
    var shown: BitmapDrawable? = null
    var copying = false
    var ownerAlpha = Float.NaN
    var ready = false
}

private fun luminancePlateLine(values: FloatArray): Pair<Float, Float> {
    if (values.size < 2) return 0f to values.first()
    val mean = values.average().toFloat()
    var covariance = 0f
    var spread = 0f
    values.forEachIndexed { index, value ->
        val offset = index / (values.size - 1f) - 0.5f
        covariance += offset * (value - mean)
        spread += offset * offset
    }
    val slope = covariance / spread
    return slope to mean - slope * 0.5f
}

class BlurView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {

    private val density = context.resources.displayMetrics.density

    private var intensity: Float = 100f
    private var customBlurRadius: Float? = null
    private var saturationBoost: Float = 1f
    private var tint: String = "default"
    private var cornerRadius: Float = 0f
    private var blurEffect: RenderEffect? = null
    private var appliedEffect: RenderEffect? = null

    private val surfaceMirrors = mutableMapOf<SurfaceView, SurfaceMirror>()
    private val mainHandler = Handler(Looper.getMainLooper())
    private var mirrorLoopRunning = false
    private var lastMirrorNanos = 0L
    private val layoutListener = ViewTreeObserver.OnGlobalLayoutListener { syncSurfaceMirrors() }
    private val preDrawListener = ViewTreeObserver.OnPreDrawListener {
        applyChildEffects()
        surfaceMirrors.values.forEach(::syncSurfaceAlpha)
        true
    }
    private val mirrorFrameCallback = object : Choreographer.FrameCallback {
        override fun doFrame(frameTimeNanos: Long) {
            if (!mirrorLoopRunning) return
            if (frameTimeNanos - lastMirrorNanos >= SURFACE_MIRROR_INTERVAL_NANOS) {
                lastMirrorNanos = frameTimeNanos
                surfaceMirrors.values.forEach(::copySurface)
            }
            Choreographer.getInstance().postFrameCallback(this)
        }
    }

    private val rimPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = density * 0.75f
    }

    private val tintPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = Color.TRANSPARENT
    }

    private val drawRect = RectF()
    private val rimRect = RectF()

    init {
        setWillNotDraw(false)
        updateOutline()
        updateShaders()
        applyEffects()
    }

    fun setIntensity(intensity: Double) {
        this.intensity = intensity.toFloat().coerceIn(0f, 100f)
        updateShaders()
        applyEffects()
        invalidate()
    }

    fun setBlurRadius(radius: Double) {
        this.customBlurRadius = if (radius > 0) radius.toFloat() else null
        applyEffects()
    }

    fun setSaturation(saturation: Double) {
        this.saturationBoost = saturation.toFloat().coerceAtLeast(0f)
        applyEffects()
    }

    fun setTint(tint: String) {
        this.tint = tint
        applyEffects()
    }

    fun setTintColor(colorStr: String?) {
        tintPaint.color = colorStr?.takeIf { it.isNotBlank() }
            ?.let { runCatching { parseColor(it) }.getOrNull() }
            ?: Color.TRANSPARENT
        invalidate()
    }

    fun setBorderRadius(radius: Double) {
        this.cornerRadius = radius.toFloat().coerceAtLeast(0f)
        updateOutline()
        updateShaders()
        invalidate()
    }

    override fun onViewAdded(child: View) {
        super.onViewAdded(child)
        applyEffects()
    }

    override fun onDescendantInvalidated(child: View, target: View) {
        super.onDescendantInvalidated(child, target)
        if (blurEffect != null) invalidate()
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        viewTreeObserver.addOnGlobalLayoutListener(layoutListener)
        viewTreeObserver.addOnPreDrawListener(preDrawListener)
        syncSurfaceMirrors()
    }

    override fun onDetachedFromWindow() {
        viewTreeObserver.removeOnGlobalLayoutListener(layoutListener)
        viewTreeObserver.removeOnPreDrawListener(preDrawListener)
        surfaceMirrors.keys.toList().forEach(::releaseMirror)
        stopMirrorLoop()
        super.onDetachedFromWindow()
    }

    // ponytail: rescans the whole subtree on every global layout to find SurfaceViews (O(n) per layout);
    // upgrade path is an OnHierarchyChangeListener chain if the blurred tree gets large.
    private fun syncSurfaceMirrors() {
        val found = if (blurEffect != null && isAttachedToWindow) collectSurfaceViews(this, mutableListOf()) else emptyList()
        (surfaceMirrors.keys - found.toSet()).forEach(::releaseMirror)
        found.forEach { surfaceMirrors.getOrPut(it) { SurfaceMirror(it) } }
        if (surfaceMirrors.isEmpty()) stopMirrorLoop() else startMirrorLoop()
    }

    private fun collectSurfaceViews(group: ViewGroup, out: MutableList<SurfaceView>): MutableList<SurfaceView> {
        for (index in 0 until group.childCount) {
            when (val child = group.getChildAt(index)) {
                is SurfaceView -> out.add(child)
                is ViewGroup -> collectSurfaceViews(child, out)
            }
        }
        return out
    }

    private fun startMirrorLoop() {
        if (mirrorLoopRunning) return
        mirrorLoopRunning = true
        lastMirrorNanos = 0L
        Choreographer.getInstance().postFrameCallback(mirrorFrameCallback)
    }

    private fun stopMirrorLoop() {
        if (!mirrorLoopRunning) return
        mirrorLoopRunning = false
        Choreographer.getInstance().removeFrameCallback(mirrorFrameCallback)
    }

    private fun copySurface(mirror: SurfaceMirror) {
        val view = mirror.view
        if (mirror.copying) return
        if (view.width <= 0 || view.height <= 0 || !view.holder.surface.isValid) {
            mirror.ready = true
            return
        }
        val frame = mirrorFrameBuffer(
            mirror,
            (view.width / SURFACE_MIRROR_DOWNSCALE).coerceAtLeast(1),
            (view.height / SURFACE_MIRROR_DOWNSCALE).coerceAtLeast(1)
        )
        mirror.copying = true
        PixelCopy.request(view, frame.bitmap, { result ->
            mirror.copying = false
            mirror.ready = true
            if (result == PixelCopy.SUCCESS && surfaceMirrors[view] === mirror) showMirror(mirror, frame)
            invalidate()
        }, mainHandler)
    }

    private fun mirrorFrameBuffer(mirror: SurfaceMirror, width: Int, height: Int): BitmapDrawable {
        val existing = mirror.frames[mirror.next]
        if (existing != null && existing.bitmap.width == width && existing.bitmap.height == height) return existing
        return BitmapDrawable(resources, Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)).also {
            it.isFilterBitmap = true
            mirror.frames[mirror.next] = it
        }
    }

    private fun showMirror(mirror: SurfaceMirror, frame: BitmapDrawable) {
        val overlay = mirror.view.overlay
        mirror.shown?.let { if (it !== frame) overlay.remove(it) }
        frame.setBounds(0, 0, mirror.view.width, mirror.view.height)
        if (mirror.shown !== frame) overlay.add(frame) else mirror.view.invalidate()
        mirror.shown = frame
        mirror.next = 1 - mirror.next
    }

    private fun syncSurfaceAlpha(mirror: SurfaceMirror) {
        val shown = mirror.shown ?: return
        if (appliedEffect == null) {
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

    private fun releaseMirror(view: SurfaceView) {
        val mirror = surfaceMirrors.remove(view) ?: return
        mirror.shown?.let { view.overlay.remove(it) }
        mirror.shown = null
        if (!mirror.ownerAlpha.isNaN()) view.alpha = mirror.ownerAlpha
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        if (cornerRadius > 0f) {
            invalidateOutline()
        }
        updateShaders()
    }

    private fun updateOutline() {
        if (cornerRadius > 0f) {
            clipToOutline = true
            outlineProvider = object : ViewOutlineProvider() {
                override fun getOutline(view: View, outline: Outline) {
                    outline.setRoundRect(0, 0, view.width, view.height, cornerRadius)
                }
            }
        } else {
            clipToOutline = false
            outlineProvider = ViewOutlineProvider.BACKGROUND
        }
    }

    private fun updateShaders() {
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0f || h <= 0f) return

        drawRect.set(0f, 0f, w, h)
        val halfStroke = rimPaint.strokeWidth * 0.5f
        rimRect.set(halfStroke, halfStroke, w - halfStroke, h - halfStroke)

        val fraction = intensity / 100f
        rimPaint.shader = LinearGradient(
            0f, 0f, 0f, h,
            intArrayOf(
                Color.argb((115 * fraction).toInt(), 255, 255, 255),
                Color.argb((38 * fraction).toInt(), 255, 255, 255),
                Color.argb((13 * fraction).toInt(), 255, 255, 255)
            ),
            floatArrayOf(0f, 0.45f, 1f),
            Shader.TileMode.CLAMP
        )
    }

    private fun resolveMaterial(): Material {
        val night = resources.configuration.uiMode and
            Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES
        return when (tint.lowercase()) {
            "light" -> LEGACY_LIGHT
            "extralight" -> LEGACY_EXTRA_LIGHT
            "dark" -> LEGACY_DARK
            "prominent" -> if (night) LEGACY_DARK else LEGACY_EXTRA_LIGHT
            "systemultrathinmaterial", "glass", "liquid" -> recipe("ultrathin", night)
            "systemthinmaterial" -> recipe("thin", night)
            "systemmaterial" -> recipe("regular", night)
            "systemthickmaterial" -> recipe("thick", night)
            "systemchromematerial" -> recipe("chrome", night)
            else -> if (night) LEGACY_DARK else LEGACY_LIGHT
        }
    }

    private fun recipe(key: String, night: Boolean) =
        (if (night) DARK_MATERIALS else LIGHT_MATERIALS).getValue(key)

    private fun materialColorEffect(material: Material, fraction: Float): RenderEffect {
        val amount = material.luminanceAmount * fraction
        val (slope, intercept) = luminancePlateLine(material.luminanceValues)
        val backdrop = 1f - amount
        val plate = amount * slope
        val offset = (amount * intercept + material.brightness * fraction) * 255f
        val saturation = ColorMatrix().apply {
            setSaturation(1f + (material.saturation * saturationBoost - 1f) * fraction)
        }
        val plateMatrix = ColorMatrix(
            floatArrayOf(
                backdrop + plate * LUMA_R, plate * LUMA_G, plate * LUMA_B, 0f, offset,
                plate * LUMA_R, backdrop + plate * LUMA_G, plate * LUMA_B, 0f, offset,
                plate * LUMA_R, plate * LUMA_G, backdrop + plate * LUMA_B, 0f, offset,
                0f, 0f, 0f, 1f, 0f
            )
        )
        if (!material.clampsBetweenStages) {
            saturation.postConcat(plateMatrix)
            return RenderEffect.createColorFilterEffect(ColorMatrixColorFilter(saturation))
        }
        return RenderEffect.createColorFilterEffect(
            ColorMatrixColorFilter(plateMatrix),
            RenderEffect.createColorFilterEffect(ColorMatrixColorFilter(saturation))
        )
    }

    private fun applyEffects() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return

        val fraction = intensity / 100f
        val material = resolveMaterial()
        val sigma = (customBlurRadius ?: material.blurRadius) * fraction * density
        val effect = if (sigma > 0.5f) {
            val radius = (sigma - 0.5f) / SKIA_RADIUS_TO_SIGMA
            RenderEffect.createChainEffect(
                RenderEffect.createBlurEffect(radius, radius, Shader.TileMode.CLAMP),
                materialColorEffect(material, fraction)
            )
        } else {
            null
        }
        blurEffect = effect
        syncSurfaceMirrors()
        applyChildEffects()
    }

    private fun applyChildEffects() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
        val waitingForMirror = appliedEffect == null && surfaceMirrors.values.any { !it.ready }
        appliedEffect = if (waitingForMirror) null else blurEffect
        for (index in 0 until childCount) {
            getChildAt(index).setRenderEffect(appliedEffect)
        }
    }

    override fun dispatchDraw(canvas: Canvas) {
        super.dispatchDraw(canvas)

        if (Color.alpha(tintPaint.color) > 0) {
            canvas.drawRoundRect(drawRect, cornerRadius, cornerRadius, tintPaint)
        }

        if (intensity > 0f) {
            canvas.drawRoundRect(rimRect, cornerRadius, cornerRadius, rimPaint)
        }
    }

    private fun parseColor(colorStr: String): Int {
        val trimmed = colorStr.trim()
        if (trimmed.startsWith("rgba", ignoreCase = true) || trimmed.startsWith("rgb", ignoreCase = true)) {
            val parts = trimmed.substringAfter("(").substringBefore(")").split(",")
            val r = parts[0].trim().toInt()
            val g = parts[1].trim().toInt()
            val b = parts[2].trim().toInt()
            val a = if (parts.size == 4) (parts[3].trim().toFloat() * 255).toInt() else 255
            return Color.argb(a, r, g, b)
        }
        return Color.parseColor(trimmed)
    }
}
