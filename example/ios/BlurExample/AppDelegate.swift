import UIKit
import AVFoundation
import NguyenduyBlur
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    return true
  }

  func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    let configuration = UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    configuration.delegateClass = SceneDelegate.self
    return configuration
  }

  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    RCTLinkingManager.application(app, open: url, options: options)
  }
}

// iOS 27 requires the UIScene lifecycle.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window
    appDelegate.reactNativeFactory?.startReactNative(withModuleName: "BlurExample", in: window, launchOptions: nil)
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      if context.url.scheme == "blurexample" && (context.url.host == "video" || context.url.path.contains("video")) {
        DispatchQueue.main.async {
          if let rootVC = self.window?.rootViewController {
            let testVC = VideoTestViewController()
            testVC.modalPresentationStyle = .fullScreen
            rootVC.present(testVC, animated: true)
          }
        }
        return
      }
      RCTLinkingManager.application(UIApplication.shared, open: context.url, options: [:])
    }
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

final class VideoTestViewController: UIViewController {
  private var player1: AVPlayer?
  private var playerLayer1: AVPlayerLayer?
  private var player2: AVPlayer?
  private var playerLayer2: AVPlayerLayer?
  private var backdropBlur: NguyenduyBlur.BlurView?
  private var contentBlur: NguyenduyBlur.BlurView?

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = UIColor(white: 0.07, alpha: 1.0)

    let scrollView = UIScrollView()
    scrollView.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(scrollView)

    let stack = UIStackView()
    stack.axis = .vertical
    stack.spacing = 20
    stack.translatesAutoresizingMaskIntoConstraints = false
    scrollView.addSubview(stack)

    NSLayoutConstraint.activate([
      scrollView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
      scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

      stack.topAnchor.constraint(equalTo: scrollView.topAnchor, constant: 16),
      stack.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor, constant: 16),
      stack.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor, constant: -16),
      stack.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor, constant: -32),
      stack.widthAnchor.constraint(equalTo: scrollView.widthAnchor, constant: -32)
    ])

    // Title
    let titleLabel = UILabel()
    titleLabel.text = "iOS Video & Backdrop Blur Test"
    titleLabel.textColor = .white
    titleLabel.font = .boldSystemFont(ofSize: 22)
    stack.addArrangedSubview(titleLabel)

    let subtitleLabel = UILabel()
    subtitleLabel.text = "Testing AVPlayer Backdrop Blur & Specular Rim on iOS"
    subtitleLabel.textColor = UIColor(white: 0.65, alpha: 1.0)
    subtitleLabel.font = .systemFont(ofSize: 13)
    stack.addArrangedSubview(subtitleLabel)

    // Back button
    let closeBtn = UIButton(type: .system)
    closeBtn.setTitle("← Back to Example Screen", for: .normal)
    closeBtn.setTitleColor(.systemCyan, for: .normal)
    closeBtn.contentHorizontalAlignment = .leading
    closeBtn.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)
    stack.addArrangedSubview(closeBtn)

    guard let videoURL = Bundle.main.url(forResource: "sample", withExtension: "mp4") ?? URL(string: "file:///tmp/sample.mp4") else {
      let errLabel = UILabel()
      errLabel.text = "Error: sample.mp4 not found"
      errLabel.textColor = .systemRed
      stack.addArrangedSubview(errLabel)
      return
    }

    // SECTION 1: Backdrop Mode over AVPlayer
    let s1Title = UILabel()
    s1Title.text = "1. Backdrop Mode: Frosted Glass Card over AVPlayer"
    s1Title.textColor = UIColor(red: 0.3, green: 0.67, blue: 0.97, alpha: 1.0)
    s1Title.font = .boldSystemFont(ofSize: 15)
    stack.addArrangedSubview(s1Title)

    let frame1 = UIView()
    frame1.backgroundColor = .black
    frame1.layer.cornerRadius = 16
    frame1.clipsToBounds = true
    frame1.translatesAutoresizingMaskIntoConstraints = false
    frame1.heightAnchor.constraint(equalToConstant: 220).isActive = true
    stack.addArrangedSubview(frame1)

    let p1 = AVPlayer(url: videoURL)
    p1.actionAtItemEnd = .none
    NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: p1.currentItem, queue: .main) { _ in
      p1.seek(to: .zero)
      p1.play()
    }
    self.player1 = p1
    let pl1 = AVPlayerLayer(player: p1)
    pl1.videoGravity = .resizeAspectFill
    frame1.layer.addSublayer(pl1)
    self.playerLayer1 = pl1

    // Backdrop BlurView card floating over right half of video
    let bBlur = NguyenduyBlur.BlurView(frame: .zero)
    bBlur.translatesAutoresizingMaskIntoConstraints = false
    bBlur.setIntensity(85.0)
    bBlur.setTint("systemMaterial")
    bBlur.setTintColor(UIColor(white: 1.0, alpha: 0.15))
    bBlur.setCornerRadii([24, 24, 24, 24])
    frame1.addSubview(bBlur)
    self.backdropBlur = bBlur

    NSLayoutConstraint.activate([
      bBlur.centerYAnchor.constraint(equalTo: frame1.centerYAnchor),
      bBlur.trailingAnchor.constraint(equalTo: frame1.trailingAnchor, constant: -16),
      bBlur.widthAnchor.constraint(equalToConstant: 180),
      bBlur.heightAnchor.constraint(equalToConstant: 160)
    ])

    let cardLabel = UILabel()
    cardLabel.text = "Backdrop Blur\n(85% Intensity)\nSpecular Rim"
    cardLabel.numberOfLines = 0
    cardLabel.textAlignment = .center
    cardLabel.textColor = .white
    cardLabel.font = .boldSystemFont(ofSize: 13)
    cardLabel.translatesAutoresizingMaskIntoConstraints = false
    bBlur.addSubview(cardLabel)
    NSLayoutConstraint.activate([
      cardLabel.centerXAnchor.constraint(equalTo: bBlur.centerXAnchor),
      cardLabel.centerYAnchor.constraint(equalTo: bBlur.centerYAnchor)
    ])

    let label1 = UILabel()
    label1.text = " Left: Sharp video | Right: Frosted Glass Card "
    label1.textColor = .white
    label1.backgroundColor = UIColor(white: 0, alpha: 0.6)
    label1.font = .systemFont(ofSize: 11)
    label1.layer.cornerRadius = 4
    label1.clipsToBounds = true
    label1.translatesAutoresizingMaskIntoConstraints = false
    frame1.addSubview(label1)
    NSLayoutConstraint.activate([
      label1.leadingAnchor.constraint(equalTo: frame1.leadingAnchor, constant: 8),
      label1.bottomAnchor.constraint(equalTo: frame1.bottomAnchor, constant: -8)
    ])

    // SECTION 2: Content Mode over AVPlayer
    let s2Title = UILabel()
    s2Title.text = "2. Content Mode: Sharp Video vs Blurred Video"
    s2Title.textColor = UIColor(red: 0.3, green: 0.67, blue: 0.97, alpha: 1.0)
    s2Title.font = .boldSystemFont(ofSize: 15)
    stack.addArrangedSubview(s2Title)

    let row2 = UIStackView()
    row2.axis = .horizontal
    row2.distribution = .fillEqually
    row2.spacing = 12
    row2.translatesAutoresizingMaskIntoConstraints = false
    row2.heightAnchor.constraint(equalToConstant: 160).isActive = true
    stack.addArrangedSubview(row2)

    // Left: Sharp
    let sharpContainer = UIView()
    sharpContainer.backgroundColor = .black
    sharpContainer.layer.cornerRadius = 16
    sharpContainer.clipsToBounds = true
    row2.addArrangedSubview(sharpContainer)

    let p2 = AVPlayer(url: videoURL)
    p2.actionAtItemEnd = .none
    NotificationCenter.default.addObserver(forName: .AVPlayerItemDidPlayToEndTime, object: p2.currentItem, queue: .main) { _ in
      p2.seek(to: .zero)
      p2.play()
    }
    self.player2 = p2
    let pl2 = AVPlayerLayer(player: p2)
    pl2.videoGravity = .resizeAspectFill
    sharpContainer.layer.addSublayer(pl2)
    self.playerLayer2 = pl2

    let sharpBadge = UILabel()
    sharpBadge.text = " Sharp (No Blur) "
    sharpBadge.textColor = .white
    sharpBadge.backgroundColor = UIColor(white: 0, alpha: 0.6)
    sharpBadge.font = .systemFont(ofSize: 11)
    sharpBadge.layer.cornerRadius = 4
    sharpBadge.clipsToBounds = true
    sharpBadge.translatesAutoresizingMaskIntoConstraints = false
    sharpContainer.addSubview(sharpBadge)
    NSLayoutConstraint.activate([
      sharpBadge.leadingAnchor.constraint(equalTo: sharpContainer.leadingAnchor, constant: 8),
      sharpBadge.bottomAnchor.constraint(equalTo: sharpContainer.bottomAnchor, constant: -8)
    ])

    // Right: Blurred
    let blurredContainer = UIView()
    blurredContainer.backgroundColor = .black
    blurredContainer.layer.cornerRadius = 16
    blurredContainer.clipsToBounds = true
    row2.addArrangedSubview(blurredContainer)

    let pl3 = AVPlayerLayer(player: p2)
    pl3.videoGravity = .resizeAspectFill
    blurredContainer.layer.addSublayer(pl3)

    let cBlur = NguyenduyBlur.BlurView(frame: .zero)
    cBlur.translatesAutoresizingMaskIntoConstraints = false
    cBlur.setIntensity(75.0)
    cBlur.setTint("systemMaterial")
    cBlur.setCornerRadii([16, 16, 16, 16])
    blurredContainer.addSubview(cBlur)
    self.contentBlur = cBlur
    NSLayoutConstraint.activate([
      cBlur.topAnchor.constraint(equalTo: blurredContainer.topAnchor),
      cBlur.leadingAnchor.constraint(equalTo: blurredContainer.leadingAnchor),
      cBlur.trailingAnchor.constraint(equalTo: blurredContainer.trailingAnchor),
      cBlur.bottomAnchor.constraint(equalTo: blurredContainer.bottomAnchor)
    ])

    let blurredBadge = UILabel()
    blurredBadge.text = " BlurView (75%) "
    blurredBadge.textColor = .white
    blurredBadge.backgroundColor = UIColor(white: 0, alpha: 0.6)
    blurredBadge.font = .systemFont(ofSize: 11)
    blurredBadge.layer.cornerRadius = 4
    blurredBadge.clipsToBounds = true
    blurredBadge.translatesAutoresizingMaskIntoConstraints = false
    blurredContainer.addSubview(blurredBadge)
    NSLayoutConstraint.activate([
      blurredBadge.leadingAnchor.constraint(equalTo: blurredContainer.leadingAnchor, constant: 8),
      blurredBadge.bottomAnchor.constraint(equalTo: blurredContainer.bottomAnchor, constant: -8)
    ])

    p1.play()
    p2.play()
  }

  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    if let pl1 = playerLayer1, let superlayer = pl1.superlayer {
      pl1.frame = superlayer.bounds
    }
    if let pl2 = playerLayer2, let superlayer = pl2.superlayer {
      pl2.frame = superlayer.bounds
    }
  }

  @objc private func closeTapped() {
    dismiss(animated: true)
  }
}
