package com.blurexample

import android.app.Activity
import android.graphics.Color
import android.graphics.SurfaceTexture
import android.media.MediaPlayer
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.Gravity
import android.view.TextureView
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.VideoView
import com.nguyenduy.blur.BlurView
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream

class VideoTestActivity : Activity() {

    private val TAG = "VideoTestActivity"
    private var mediaPlayer: MediaPlayer? = null
    private val videoViews = mutableListOf<VideoView>()
    private var backdropBlurView: BlurView? = null
    private var contentBlurView: BlurView? = null

    private fun getVideoUri(): Uri {
        // Try local raw resource first
        val rawResId = resources.getIdentifier("sample", "raw", packageName)
        if (rawResId != 0) return Uri.parse("android.resource://$packageName/$rawResId")
        // Copy from sdcard into app cache (no external-storage permission needed on API 29+)
        val cached = File(cacheDir, "sample.mp4")
        if (!cached.exists()) {
            val sdFile = File("/sdcard/sample.mp4")
            if (sdFile.exists()) {
                try {
                    FileInputStream(sdFile).use { input ->
                        FileOutputStream(cached).use { output -> input.copyTo(output) }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "copy sdcard->cache failed", e)
                }
            }
        }
        if (cached.exists()) return Uri.fromFile(cached)
        // Last resort: stream from Google CDN
        return Uri.parse("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4")
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val density = resources.displayMetrics.density
        fun dp(v: Int) = (v * density).toInt()

        val root = ScrollView(this).apply {
            setBackgroundColor(Color.parseColor("#121212"))
        }

        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(32), dp(16), dp(48))
        }
        root.addView(container)

        // Title
        val title = TextView(this).apply {
            text = "Video & Backdrop Blur Test"
            textSize = 22f
            setTextColor(Color.WHITE)
            setTypeface(null, android.graphics.Typeface.BOLD)
        }
        container.addView(title)

        // Subtitle
        val subtitle = TextView(this).apply {
            text = "Testing SurfaceView PixelCopy, TextureView Backdrop & Lifecycle"
            textSize = 13f
            setTextColor(Color.parseColor("#aaaaaa"))
            setPadding(0, dp(4), 0, dp(20))
        }
        container.addView(subtitle)

        // ==========================================
        // SECTION 1: Content Mode (SurfaceView)
        // ==========================================
        val section1Title = TextView(this).apply {
            text = "1. Content Mode: Sharp vs Blurred SurfaceView"
            textSize = 16f
            setTextColor(Color.parseColor("#4dabf7"))
            setTypeface(null, android.graphics.Typeface.BOLD)
            setPadding(0, dp(8), 0, dp(8))
        }
        container.addView(section1Title)

        val row1 = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            weightSum = 2f
        }
        container.addView(row1, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(160)))

        // 1A. Sharp VideoView
        val card1A = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#222222"))
        }
        val lp1A = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f).apply {
            marginEnd = dp(8)
        }
        row1.addView(card1A, lp1A)

        val sharpVideo = VideoView(this).apply {
            setVideoURI(getVideoUri())
            setOnPreparedListener { mp ->
                mp.isLooping = true
                start()
                Log.d(TAG, "Sharp VideoView started")
            }
        }
        videoViews.add(sharpVideo)
        card1A.addView(sharpVideo, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))

        val label1A = TextView(this).apply {
            text = "Sharp (No Blur)"
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#88000000"))
            setPadding(dp(6), dp(4), dp(6), dp(4))
            textSize = 11f
        }
        card1A.addView(label1A, FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            gravity = Gravity.BOTTOM or Gravity.START
        })

        // 1B. Blurred VideoView (inside BlurView in content mode)
        val card1B = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#222222"))
        }
        val lp1B = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f)
        row1.addView(card1B, lp1B)

        val blurContentContainer = BlurView(this).apply {
            contentBlurView = this
            setMode("content")
            setIntensity(75.0)
            setTint("systemMaterial")
            setCornerRadii(listOf(16.0, 16.0, 16.0, 16.0))
        }
        card1B.addView(blurContentContainer, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))

        val blurredVideo = VideoView(this).apply {
            setVideoURI(getVideoUri())
            setOnPreparedListener { mp ->
                mp.isLooping = true
                start()
                Log.d(TAG, "Blurred VideoView started")
            }
        }
        videoViews.add(blurredVideo)
        blurContentContainer.blurContent.addView(blurredVideo, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))

        val label1B = TextView(this).apply {
            text = "BlurView (PixelCopy 75)"
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#88000000"))
            setPadding(dp(6), dp(4), dp(6), dp(4))
            textSize = 11f
        }
        card1B.addView(label1B, FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            gravity = Gravity.BOTTOM or Gravity.START
        })

        // ==========================================
        // SECTION 2: Backdrop Mode over TextureView
        // ==========================================
        val section2Title = TextView(this).apply {
            text = "2. Backdrop Mode: Frosted Glass over TextureView"
            textSize = 16f
            setTextColor(Color.parseColor("#4dabf7"))
            setTypeface(null, android.graphics.Typeface.BOLD)
            setPadding(0, dp(24), 0, dp(8))
        }
        container.addView(section2Title)

        val frame2 = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#1e1e1e"))
        }
        container.addView(frame2, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(200)))

        val textureView = TextureView(this).apply {
            surfaceTextureListener = object : TextureView.SurfaceTextureListener {
                override fun onSurfaceTextureAvailable(surface: SurfaceTexture, width: Int, height: Int) {
                    try {
                        mediaPlayer = MediaPlayer().apply {
                            setDataSource(this@VideoTestActivity, getVideoUri())
                            setSurface(android.view.Surface(surface))
                            isLooping = true
                            prepare()
                            start()
                            Log.d(TAG, "TextureView MediaPlayer started")
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "TextureView MediaPlayer error", e)
                    }
                }
                override fun onSurfaceTextureSizeChanged(surface: SurfaceTexture, width: Int, height: Int) {}
                override fun onSurfaceTextureDestroyed(surface: SurfaceTexture): Boolean {
                    mediaPlayer?.release()
                    mediaPlayer = null
                    return true
                }
                override fun onSurfaceTextureUpdated(surface: SurfaceTexture) {}
            }
        }
        frame2.addView(textureView, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))

        // Backdrop BlurView card covering right half of the playing TextureView video
        val backdropCard = BlurView(this).apply {
            backdropBlurView = this
            setMode("backdrop")
            setIntensity(80.0)
            setTint("systemMaterial")
            setTintColor(Color.parseColor("#25ffffff"))
            setCornerRadii(listOf(24.0, 24.0, 24.0, 24.0))
        }
        val backdropLp = FrameLayout.LayoutParams(dp(180), dp(160)).apply {
            gravity = Gravity.CENTER_VERTICAL or Gravity.END
            marginEnd = dp(16)
        }
        frame2.addView(backdropCard, backdropLp)

        val backdropInner = TextView(this).apply {
            text = "Backdrop Blur\n(80% Intensity)\nFrosted Glass Card"
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            textSize = 13f
            setTypeface(null, android.graphics.Typeface.BOLD)
        }
        backdropCard.blurContent.addView(backdropInner, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))

        val label2 = TextView(this).apply {
            text = "Left: Raw video | Right: Backdrop BlurView"
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#99000000"))
            setPadding(dp(6), dp(4), dp(6), dp(4))
            textSize = 11f
        }
        frame2.addView(label2, FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            gravity = Gravity.BOTTOM or Gravity.START
        })

        // ==========================================
        // SECTION 3: Backdrop Mode over SurfaceView (Safety Fallback)
        // ==========================================
        val section3Title = TextView(this).apply {
            text = "3. Backdrop Mode over SurfaceView & TextView (20% Blur)"
            textSize = 16f
            setTextColor(Color.parseColor("#4dabf7"))
            setTypeface(null, android.graphics.Typeface.BOLD)
            setPadding(0, dp(24), 0, dp(8))
        }
        container.addView(section3Title)

        val frame3 = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#1e1e1e"))
        }
        container.addView(frame3, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(180)))

        val surfaceVideo3 = VideoView(this).apply {
            setVideoURI(getVideoUri())
            setOnPreparedListener { mp ->
                mp.isLooping = true
                start()
            }
        }
        videoViews.add(surfaceVideo3)
        frame3.addView(surfaceVideo3, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))

        val siblingText3 = TextView(this).apply {
            text = "SURFACEVIEW + TEXTVIEW SIBLING"
            setTextColor(Color.parseColor("#ffcc00"))
            textSize = 12f
            setTypeface(null, android.graphics.Typeface.BOLD)
            setBackgroundColor(Color.parseColor("#99000000"))
            setPadding(dp(8), dp(4), dp(8), dp(4))
        }
        frame3.addView(siblingText3, FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply {
            gravity = Gravity.TOP or Gravity.START
            setMargins(dp(12), dp(12), 0, 0)
        })

        val backdropSurfaceCard = BlurView(this).apply {
            setMode("backdrop")
            setIntensity(20.0)
            setTint("dark")
            setTintColor(Color.parseColor("#40000000"))
            setCornerRadii(listOf(16.0, 16.0, 16.0, 16.0))
        }
        val backdropSurfaceLp = FrameLayout.LayoutParams(dp(220), dp(110)).apply {
            gravity = Gravity.CENTER
        }
        frame3.addView(backdropSurfaceCard, backdropSurfaceLp)

        val backdropSurfaceText = TextView(this).apply {
            text = "Backdrop 20% Blur\nOver SurfaceView + TextView\n(PixelCopy mirror)"
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            textSize = 12f
            setTypeface(null, android.graphics.Typeface.BOLD)
        }
        backdropSurfaceCard.blurContent.addView(backdropSurfaceText, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))

        setContentView(root)
        Log.d(TAG, "VideoTestActivity initialized successfully")
    }

    override fun onResume() {
        super.onResume()
        Log.d(TAG, "onResume called: resuming video playback")
        for (vv in videoViews) {
            if (!vv.isPlaying) vv.start()
        }
        mediaPlayer?.start()
    }

    override fun onPause() {
        super.onPause()
        Log.d(TAG, "onPause called: pausing video playback")
        for (vv in videoViews) {
            if (vv.isPlaying) vv.pause()
        }
        mediaPlayer?.pause()
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "onDestroy called: releasing resources")
        mediaPlayer?.release()
        mediaPlayer = null
    }
}
