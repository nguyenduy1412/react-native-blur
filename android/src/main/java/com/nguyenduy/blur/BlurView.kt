package com.nguyenduy.blur

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
import android.graphics.Path
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.RenderEffect
import android.graphics.RenderNode
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
import com.facebook.react.bridge.ReactContext
import com.facebook.react.views.view.ReactViewGroup

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
private const val WINDOW_MIRROR_INTERVAL_NANOS = 33_000_000L
private const val WINDOW_MIRROR_DOWNSCALE = 2

// A PixelCopy copy of a SurfaceView, shown in the SurfaceView's overlay.
// Content mode: a quarter-size copy that the content blur blurs in place.
// Backdrop mode: a full-size copy that covers the live video, so the sharp
// video around the BlurView and the blurred copy behind it come from the
// same frame instead of the copy trailing the live video.
internal class SurfaceMirror(val view: SurfaceView, val forContent: Boolean) {
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

class BlurView(context: Context) : ReactViewGroup(context) {

    private companion object {
        // Depth of backdrop captures in progress on the UI thread.
        var captureDepth = 0

        // SurfaceViews with a PixelCopy in flight, across all BlurViews. One
        // copy at a time per SurfaceView; its result is shared with every
        // BlurView that mirrors the same SurfaceView.
        val copiesInFlight = HashSet<SurfaceView>()
        val mirrorSubscribers = HashMap<SurfaceView, MutableSet<BlurView>>()
    }

    private val density = context.resources.displayMetrics.density

    private var intensity: Float = 50f
    private var customBlurRadius: Float? = null
    private var saturationBoost: Float = 1f
    private var tint: String = "default"
    // Corner radii in px: top-left, top-right, bottom-right, bottom-left.
    private val cornerRadii = FloatArray(4)
    private val cornerPath = Path()
    // 'light' or 'dark' from React Native's Appearance; overrides the
    // configuration, which AppCompat night-mode overrides do not dispatch to views.
    private var colorScheme: String? = null
    private var nightMode = isNight(resources.configuration)
    private var blurEffect: RenderEffect? = null
    private var appliedEffect: RenderEffect? = null
    private var backdropMode = false

    // Backdrop inside another window (React Native <Modal>): the activity
    // window behind it is copied with PixelCopy and drawn under the siblings.
    private var windowMirror: BitmapDrawable? = null
    private var windowMirrorPending: BitmapDrawable? = null
    private var windowMirrorCopying = false
    private val windowMirrorRect = Rect()
    private val windowLocation = IntArray(2)

    private val surfaceMirrors = mutableMapOf<SurfaceView, SurfaceMirror>()
    private val mainHandler = Handler(Looper.getMainLooper())
    private var mirrorLoopRunning = false
    private var lastMirrorNanos = 0L
    private val layoutListener = ViewTreeObserver.OnGlobalLayoutListener { syncSurfaceMirrors() }
    private val preDrawListener = ViewTreeObserver.OnPreDrawListener {
        applyChildEffects()
        surfaceMirrors.values.forEach(::syncSurfaceAlpha)
        // Re-capture the backdrop every frame, but only while this view is on
        // screen; a long list can hold many BlurViews that are scrolled away.
        if (backdropMode && blurEffect != null && getGlobalVisibleRect(selfRect)) invalidate()
        true
    }

    // Version-specific drawing (API 33+ or 31-32); null below API 31, where
    // there is no RenderEffect.
    private val renderer = BlurRenderer.create()

    // Ancestors of SurfaceViews behind a backdrop. The capture recurses into
    // these instead of drawing them in one call, so the SurfaceViews can be
    // replaced by their copies.
    private val surfaceAncestors = HashSet<View>()
    private val overlapRect = Rect()
    private val selfRect = Rect()
    private val mirrorFrameCallback = object : Choreographer.FrameCallback {
        override fun doFrame(frameTimeNanos: Long) {
            if (!mirrorLoopRunning) return
            // Video copies start again as soon as the previous one lands, so
            // the blurred copy trails the video by as little as possible.
            surfaceMirrors.values.forEach(::copySurface)
            if (frameTimeNanos - lastMirrorNanos >= WINDOW_MIRROR_INTERVAL_NANOS) {
                lastMirrorNanos = frameTimeNanos
                copyActivityWindow()
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
    private val rimPath = Path()

    private val fallbackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }

    val blurContent = BlurContentView(context) { applyEffects() }

    init {
        setWillNotDraw(false)
        addView(blurContent, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
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
        invalidate()
    }

    fun setSaturation(saturation: Double) {
        this.saturationBoost = saturation.toFloat().coerceAtLeast(0f)
        applyEffects()
        invalidate()
    }

    fun setTint(tint: String) {
        this.tint = tint
        applyEffects()
        invalidate()
    }

    fun setTintColor(color: Int?) {
        tintPaint.color = color ?: Color.TRANSPARENT
        invalidate()
    }

    fun setMode(mode: String) {
        backdropMode = mode.equals("backdrop", ignoreCase = true)
        applyEffects()
        syncWindowMirror()
        invalidate()
    }

    fun setCornerRadii(radii: List<Double>) {
        for (index in 0 until 4) {
            val value = radii.getOrNull(index) ?: radii.firstOrNull() ?: 0.0
            cornerRadii[index] = value.toFloat().coerceAtLeast(0f) * density
        }
        updateOutline()
        updateShaders()
        invalidate()
    }

    fun setColorScheme(scheme: String?) {
        colorScheme = scheme?.takeIf { it == "light" || it == "dark" }
        updateNightMode(resources.configuration)
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        updateNightMode(newConfig)
    }

    private fun updateNightMode(config: Configuration) {
        val night = isNight(config)
        if (night != nightMode) {
            nightMode = night
            applyEffects()
            invalidate()
        }
    }

    private fun isNight(config: Configuration) = when (colorScheme) {
        "dark" -> true
        "light" -> false
        else -> config.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES
    }

    private val hasUniformCorners get() = cornerRadii.all { it == cornerRadii[0] }

    private val hasCorners get() = cornerRadii.any { it > 0f }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        // React Native always measures exactly. ReactViewGroup throws for
        // anything else, which happens when BlurView is used from native code.
        if (MeasureSpec.getMode(widthMeasureSpec) == MeasureSpec.EXACTLY &&
            MeasureSpec.getMode(heightMeasureSpec) == MeasureSpec.EXACTLY
        ) {
            super.onMeasure(widthMeasureSpec, heightMeasureSpec)
        } else {
            setMeasuredDimension(MeasureSpec.getSize(widthMeasureSpec), MeasureSpec.getSize(heightMeasureSpec))
        }
        blurContent.measure(
            MeasureSpec.makeMeasureSpec(measuredWidth, MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(measuredHeight, MeasureSpec.EXACTLY)
        )
    }

    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        super.onLayout(changed, left, top, right, bottom)
        blurContent.layout(0, 0, right - left, bottom - top)
    }

    override fun onDescendantInvalidated(child: View, target: View) {
        super.onDescendantInvalidated(child, target)
        if (blurEffect != null) invalidate()
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        viewTreeObserver.addOnGlobalLayoutListener(layoutListener)
        viewTreeObserver.addOnPreDrawListener(preDrawListener)
        updateNightMode(resources.configuration)
        syncSurfaceMirrors()
        syncWindowMirror()
    }

    override fun onDetachedFromWindow() {
        viewTreeObserver.removeOnGlobalLayoutListener(layoutListener)
        viewTreeObserver.removeOnPreDrawListener(preDrawListener)
        surfaceMirrors.keys.toList().forEach(::releaseMirror)
        windowMirror = null
        windowMirrorPending = null
        stopMirrorLoop()
        super.onDetachedFromWindow()
    }

    // ponytail: rescans the whole subtree on every global layout to find SurfaceViews (O(n) per layout);
    // upgrade path is an OnHierarchyChangeListener chain if the blurred tree gets large.
    private fun syncSurfaceMirrors() {
        surfaceAncestors.clear()
        val found = when {
            blurEffect == null || !isAttachedToWindow -> emptyList()
            backdropMode -> collectBackdropSurfaceViews()
            else -> collectSurfaceViews(this, mutableListOf())
        }
        val forContent = !backdropMode
        if (!forContent) addSurfaceAncestors(found)
        (surfaceMirrors.keys - found.toSet()).forEach(::releaseMirror)
        surfaceMirrors.values.filter { it.forContent != forContent }.map { it.view }.forEach(::releaseMirror)
        found.forEach { surface ->
            surfaceMirrors.getOrPut(surface) {
                mirrorSubscribers.getOrPut(surface) { HashSet() }.add(this)
                SurfaceMirror(surface, forContent)
            }
        }
        updateMirrorLoop()
    }

    // SurfaceViews drawn before this view (earlier siblings of it or of its
    // ancestors, and their descendants). They are composited outside the view
    // tree, so the backdrop recording cannot draw them directly.
    private fun collectBackdropSurfaceViews(): List<SurfaceView> {
        val out = mutableListOf<SurfaceView>()
        var child: View = this
        var parent = child.parent as? ViewGroup
        while (parent != null) {
            for (index in 0 until parent.indexOfChild(child)) {
                when (val sibling = parent.getChildAt(index)) {
                    is SurfaceView -> out.add(sibling)
                    is ViewGroup -> collectSurfaceViews(sibling, out)
                }
            }
            child = parent
            parent = child.parent as? ViewGroup
        }
        return out
    }

    private fun addSurfaceAncestors(surfaces: List<SurfaceView>) {
        for (surface in surfaces) {
            var ancestor = surface.parent as? View
            while (ancestor != null && surfaceAncestors.add(ancestor)) {
                ancestor = ancestor.parent as? View
            }
        }
    }

    private fun updateMirrorLoop() {
        if (surfaceMirrors.isEmpty() && !needsWindowMirror()) stopMirrorLoop() else startMirrorLoop()
    }

    private fun activityWindow() = ((context as? ReactContext)?.currentActivity)?.window

    private fun needsWindowMirror(): Boolean {
        if (!backdropMode || blurEffect == null || !isAttachedToWindow) return false
        val window = activityWindow() ?: return false
        return rootView !== window.decorView
    }

    private fun syncWindowMirror() {
        if (!needsWindowMirror()) {
            windowMirror = null
            windowMirrorPending = null
        }
        updateMirrorLoop()
    }

    private fun copyActivityWindow() {
        if (windowMirrorCopying || !needsWindowMirror() || width <= 0 || height <= 0) return
        val window = activityWindow() ?: return
        val decor = window.decorView
        if (!decor.isAttachedToWindow || decor.width <= 0) return
        getLocationOnScreen(windowLocation)
        val left = windowLocation[0]
        val top = windowLocation[1]
        decor.getLocationOnScreen(windowLocation)
        windowMirrorRect.set(left - windowLocation[0], top - windowLocation[1], 0, 0)
        windowMirrorRect.right = windowMirrorRect.left + width
        windowMirrorRect.bottom = windowMirrorRect.top + height
        if (!windowMirrorRect.intersect(0, 0, decor.width, decor.height)) return
        val w = (windowMirrorRect.width() / WINDOW_MIRROR_DOWNSCALE).coerceAtLeast(1)
        val h = (windowMirrorRect.height() / WINDOW_MIRROR_DOWNSCALE).coerceAtLeast(1)
        val target = windowMirrorPending?.takeIf { it.bitmap.width == w && it.bitmap.height == h }
            ?: BitmapDrawable(resources, Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)).also { it.isFilterBitmap = true }
        val dest = Rect(
            windowMirrorRect.left - (left - windowLocation[0]),
            windowMirrorRect.top - (top - windowLocation[1]),
            0, 0
        )
        dest.right = dest.left + windowMirrorRect.width()
        dest.bottom = dest.top + windowMirrorRect.height()
        windowMirrorCopying = true
        try {
            PixelCopy.request(window, Rect(windowMirrorRect), target.bitmap, { result ->
                windowMirrorCopying = false
                if (result == PixelCopy.SUCCESS && needsWindowMirror()) {
                    target.bounds = dest
                    windowMirrorPending = windowMirror
                    windowMirror = target
                    invalidate()
                }
            }, mainHandler)
        } catch (e: IllegalArgumentException) {
            // The window has no surface yet (or anymore).
            windowMirrorCopying = false
        }
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
        // Copies are only needed while they can be seen: a content-mode
        // BlurView must be on screen, and a backdrop SurfaceView must be
        // behind this view right now.
        if (mirror.forContent) {
            if (!getGlobalVisibleRect(selfRect)) return
        } else if (!overlapsOnScreen(view)) {
            // Uncover the live video while it is not behind this view.
            hideMirror(mirror)
            return
        }
        // A copy that covers the live video must be full size; one that is
        // only ever blurred can be a quarter of it.
        val downscale = if (mirrorSubscribers[view]?.any { it.backdropMode } == true) 1 else SURFACE_MIRROR_DOWNSCALE
        val frame = mirrorFrameBuffer(
            mirror,
            (view.width / downscale).coerceAtLeast(1),
            (view.height / downscale).coerceAtLeast(1)
        )
        if (!copiesInFlight.add(view)) return
        mirror.copying = true
        try {
            PixelCopy.request(view, frame.bitmap, { result ->
                copiesInFlight.remove(view)
                mirror.copying = false
                mirror.ready = true
                if (result == PixelCopy.SUCCESS && surfaceMirrors[view] === mirror) {
                    showMirror(mirror, frame)
                    mirrorSubscribers[view]?.forEach { if (it !== this) it.receiveSharedFrame(view, frame) }
                }
                invalidate()
            }, mainHandler)
        } catch (e: IllegalArgumentException) {
            // The surface was released between the validity check and the request.
            copiesInFlight.remove(view)
            mirror.copying = false
            mirror.ready = true
        }
    }

    // A copy of [view] made by another BlurView.
    private fun receiveSharedFrame(view: SurfaceView, frame: BitmapDrawable) {
        val mirror = surfaceMirrors[view] ?: return
        mirror.ready = true
        showMirror(mirror, frame)
        invalidate()
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
        frame.setBounds(0, 0, mirror.view.width, mirror.view.height)
        val overlay = mirror.view.overlay
        mirror.shown?.let { if (it !== frame) overlay.remove(it) }
        overlay.add(frame) // no-op when already added
        mirror.view.invalidate()
        mirror.shown = frame
        mirror.next = 1 - mirror.next
        if (!mirror.forContent) frame.alpha = (mirror.view.alpha * 255).toInt()
    }

    // Uncovers the live video, unless another BlurView still shows the copy.
    private fun hideMirror(mirror: SurfaceMirror) {
        val view = mirror.view
        val stillShown = mirrorSubscribers[view]?.any { it !== this && it.showsCopyOf(view) } == true
        if (!stillShown) mirror.shown?.let { view.overlay.remove(it) }
        mirror.shown = null
    }

    private fun showsCopyOf(view: SurfaceView): Boolean {
        val mirror = surfaceMirrors[view] ?: return false
        return if (mirror.forContent) getGlobalVisibleRect(selfRect) else overlapsOnScreen(view)
    }

    private fun syncSurfaceAlpha(mirror: SurfaceMirror) {
        if (!mirror.forContent) return
        renderer?.showSurfaceCopy(mirror, appliedEffect != null)
    }

    private fun overlapsOnScreen(view: View): Boolean =
        view.getGlobalVisibleRect(overlapRect) && getGlobalVisibleRect(selfRect) &&
            Rect.intersects(overlapRect, selfRect)

    private fun releaseMirror(view: SurfaceView) {
        val mirror = surfaceMirrors.remove(view) ?: return
        mirrorSubscribers[view]?.let { subscribers ->
            subscribers.remove(this)
            if (subscribers.isEmpty()) mirrorSubscribers.remove(view)
        }
        mirror.shown?.let { view.overlay.remove(it) }
        mirror.shown = null
        if (!mirror.ownerAlpha.isNaN()) view.alpha = mirror.ownerAlpha
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        if (hasCorners) {
            invalidateOutline()
        }
        updateShaders()
    }

    private fun updateOutline() {
        // Uniform corners clip through the outline, which is antialiased.
        // Other shapes are clipped with cornerPath in draw().
        if (hasCorners && hasUniformCorners) {
            clipToOutline = true
            outlineProvider = object : ViewOutlineProvider() {
                override fun getOutline(view: View, outline: Outline) {
                    outline.setRoundRect(0, 0, view.width, view.height, cornerRadii[0])
                }
            }
        } else {
            clipToOutline = false
            outlineProvider = ViewOutlineProvider.BACKGROUND
        }
    }

    override fun draw(canvas: Canvas) {
        if (!hasCorners || hasUniformCorners) {
            super.draw(canvas)
            return
        }
        val saved = canvas.save()
        canvas.clipPath(cornerPath)
        super.draw(canvas)
        canvas.restoreToCount(saved)
    }

    private fun roundedPath(path: Path, rect: RectF, inset: Float) {
        path.reset()
        val radii = FloatArray(8)
        for (index in 0 until 4) {
            val r = (cornerRadii[index] - inset).coerceAtLeast(0f)
            radii[index * 2] = r
            radii[index * 2 + 1] = r
        }
        path.addRoundRect(rect, radii, Path.Direction.CW)
    }

    private fun updateShaders() {
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0f || h <= 0f) return

        drawRect.set(0f, 0f, w, h)
        val halfStroke = rimPaint.strokeWidth * 0.5f
        rimRect.set(halfStroke, halfStroke, w - halfStroke, h - halfStroke)
        roundedPath(cornerPath, drawRect, 0f)
        roundedPath(rimPath, rimRect, halfStroke)

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
        val night = nightMode
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
        if (renderer == null) {
            updateFallbackPlate()
            return
        }

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
        syncWindowMirror()
        applyChildEffects()
    }

    // Android 11 and below have no RenderEffect. Draw an opaque-enough plate
    // in the material's colour so content on top stays readable.
    private fun updateFallbackPlate() {
        val fraction = intensity / 100f
        val material = resolveMaterial()
        val light = material.luminanceValues.average() > 0.5
        val alpha = ((0.7f + 0.25f * material.luminanceAmount) * fraction).coerceIn(0f, 1f)
        fallbackPaint.color = if (light) {
            Color.argb((alpha * 255).toInt(), 245, 245, 247)
        } else {
            Color.argb((alpha * 255).toInt(), 28, 28, 30)
        }
    }

    private fun applyChildEffects() {
        val renderer = renderer ?: return
        val waitingForMirror = appliedEffect == null && surfaceMirrors.values.any { !it.ready }
        appliedEffect = if (backdropMode || waitingForMirror) null else blurEffect
        renderer.applyContentEffect(blurContent, appliedEffect)
    }

    override fun dispatchDraw(canvas: Canvas) {
        if (backdropMode) {
            drawBackdrop(canvas)
            drawTint(canvas)
            super.dispatchDraw(canvas)
        } else {
            val renderer = renderer
            if (renderer == null) {
                super.dispatchDraw(canvas)
            } else {
                renderer.drawContent(
                    canvas, width, height, appliedEffect,
                    record = { recording -> drawChild(recording, blurContent, drawingTime) },
                    drawDefault = { drawChildren(canvas) },
                )
            }
            drawTint(canvas)
        }

        if (intensity > 0f) {
            canvas.drawPath(rimPath, rimPaint)
        }
    }

    private fun drawChildren(canvas: Canvas) = super.dispatchDraw(canvas)

    private fun drawTint(canvas: Canvas) {
        if (renderer == null && Color.alpha(fallbackPaint.color) > 0) {
            canvas.drawPath(cornerPath, fallbackPaint)
        }
        if (Color.alpha(tintPaint.color) > 0) {
            canvas.drawPath(cornerPath, tintPaint)
        }
    }

    private fun drawBackdrop(canvas: Canvas) {
        val renderer = renderer ?: return
        // A BlurView drawn inside another BlurView's backdrop capture does not
        // capture its own backdrop: that would re-run every nested capture and
        // grows exponentially with the number of overlapping BlurViews.
        if (captureDepth > 0) return
        val effect = blurEffect ?: return
        if (!canvas.isHardwareAccelerated || width <= 0 || height <= 0) return
        val node = renderer.backdropNode()
        node.setPosition(0, 0, width, height)
        val recording = node.beginRecording(width, height)
        captureDepth++
        try {
            captureBackdrop(recording)
        } finally {
            captureDepth--
            node.endRecording()
        }
        node.setRenderEffect(effect)
        canvas.drawRenderNode(node)
    }

    private fun captureBackdrop(canvas: Canvas) {
        var child: View = this
        var parent = child.parent as? ViewGroup
        var offsetX = 0f
        var offsetY = 0f
        windowMirror?.draw(canvas)
        val levels = ArrayList<Triple<ViewGroup, Int, FloatArray>>()
        while (parent != null) {
            offsetX += child.left + child.translationX - parent.scrollX
            offsetY += child.top + child.translationY - parent.scrollY
            levels.add(Triple(parent, parent.indexOfChild(child), floatArrayOf(offsetX, offsetY)))
            child = parent
            parent = child.parent as? ViewGroup
        }

        for (level in levels.indices.reversed()) {
            val (group, branchIndex, offset) = levels[level]
            group.background?.let { background ->
                val saved = canvas.save()
                canvas.translate(-offset[0], -offset[1])
                background.setBounds(0, 0, group.width, group.height)
                background.draw(canvas)
                canvas.restoreToCount(saved)
            }
            for (index in 0 until branchIndex) {
                val sibling = group.getChildAt(index) ?: continue
                if (sibling.visibility != View.VISIBLE) continue
                val saved = canvas.save()
                canvas.translate(sibling.left - offset[0], sibling.top - offset[1])
                if (!sibling.matrix.isIdentity) canvas.concat(sibling.matrix)
                canvas.translate(-sibling.scrollX.toFloat(), -sibling.scrollY.toFloat())
                drawCaptured(canvas, sibling)
                canvas.restoreToCount(saved)
            }
        }
    }

    // Draws a view into the backdrop recording. The canvas is already at the
    // view's position with its scroll applied. SurfaceViews are replaced by
    // their PixelCopy copy; views that contain one are drawn child by child.
    private fun drawCaptured(canvas: Canvas, view: View) {
        when {
            view is SurfaceView -> surfaceMirrors[view]?.shown?.let { frame ->
                frame.alpha = (view.alpha * 255).toInt()
                frame.draw(canvas)
            }
            view is ViewGroup && view in surfaceAncestors -> {
                view.background?.let { background ->
                    background.setBounds(0, 0, view.width, view.height)
                    background.draw(canvas)
                }
                for (index in 0 until view.childCount) {
                    val child = view.getChildAt(index) ?: continue
                    if (child.visibility != View.VISIBLE) continue
                    val saved = canvas.save()
                    canvas.translate(child.left.toFloat(), child.top.toFloat())
                    if (!child.matrix.isIdentity) canvas.concat(child.matrix)
                    canvas.translate(-child.scrollX.toFloat(), -child.scrollY.toFloat())
                    drawCaptured(canvas, child)
                    canvas.restoreToCount(saved)
                }
            }
            else -> view.draw(canvas)
        }
    }
}

// Holds the BlurView's children. React Native positions its own children
// (which always have an id, their React tag). Views added directly from native
// code (no id) fill the BlurView.
class BlurContentView(context: Context, private val onChildAdded: () -> Unit) : ViewGroup(context) {
    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val width = MeasureSpec.getSize(widthMeasureSpec)
        val height = MeasureSpec.getSize(heightMeasureSpec)
        setMeasuredDimension(width, height)
        for (index in 0 until childCount) {
            val child = getChildAt(index)
            if (child.id != View.NO_ID) continue
            child.measure(
                MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
                MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
            )
        }
    }

    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        for (index in 0 until childCount) {
            val child = getChildAt(index)
            if (child.id == View.NO_ID) child.layout(0, 0, right - left, bottom - top)
        }
    }

    override fun onViewAdded(child: View) {
        super.onViewAdded(child)
        onChildAdded()
    }
}
