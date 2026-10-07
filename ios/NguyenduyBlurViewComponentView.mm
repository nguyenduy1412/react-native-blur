#import "NguyenduyBlurViewComponentView.h"

#import <react/renderer/components/NguyenduyBlurViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/NguyenduyBlurViewSpec/Props.h>
#import <react/renderer/components/NguyenduyBlurViewSpec/RCTComponentViewHelpers.h>

#import <React/RCTConversions.h>

#import "RCTFabricComponentsPlugins.h"

#if __has_include(<NguyenduyBlur/NguyenduyBlur-Swift.h>)
#import <NguyenduyBlur/NguyenduyBlur-Swift.h>
#else
#import "NguyenduyBlur-Swift.h"
#endif

using namespace facebook::react;

static const CGFloat kBackdropZPosition = -512.0f;

@interface NguyenduyBlurViewComponentView () <RCTNguyenduyBlurViewViewProtocol>
@end

@implementation NguyenduyBlurViewComponentView {
  NguyenduyBlurNativeView *_blurView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<NguyenduyBlurViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const NguyenduyBlurViewProps>();
    _props = defaultProps;
    _blurView = [[NguyenduyBlurNativeView alloc] initWithFrame:self.bounds];
    self.contentView = _blurView;
  }
  return self;
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  const auto &oldViewProps = *std::static_pointer_cast<const NguyenduyBlurViewProps>(_props);
  const auto &newViewProps = *std::static_pointer_cast<const NguyenduyBlurViewProps>(props);

  if (oldViewProps.intensity != newViewProps.intensity) {
    [_blurView setIntensity:newViewProps.intensity];
  }
  if (oldViewProps.tint != newViewProps.tint) {
    [_blurView setTint:[NSString stringWithUTF8String:newViewProps.tint.c_str()]];
  }
  if (oldViewProps.tintColor != newViewProps.tintColor) {
    [_blurView setBlurTintColor:RCTUIColorFromSharedColor(newViewProps.tintColor)];
  }
  if (oldViewProps.cornerRadii != newViewProps.cornerRadii) {
    NSMutableArray<NSNumber *> *radii = [NSMutableArray arrayWithCapacity:newViewProps.cornerRadii.size()];
    for (auto radius : newViewProps.cornerRadii) {
      [radii addObject:@(radius)];
    }
    [_blurView setCornerRadii:radii];
  }
  if (oldViewProps.mode != newViewProps.mode) {
    // The blur view is the component's content view, which UIKit keeps after
    // the React children. In content mode it covers and blurs them. In
    // backdrop mode it is moved behind them with zPosition, still above the
    // background colour layer, so the children stay sharp.
    _blurView.layer.zPosition = newViewProps.mode == "backdrop" ? kBackdropZPosition : 0;
  }

  [super updateProps:props oldProps:oldProps];
}

- (void)updateLayoutMetrics:(const LayoutMetrics &)layoutMetrics oldLayoutMetrics:(const LayoutMetrics &)oldLayoutMetrics
{
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  // The default content view frame excludes padding and borders; the blur
  // must cover the whole view.
  _blurView.frame = self.bounds;
}

@end

Class<RCTComponentViewProtocol> NguyenduyBlurViewCls(void)
{
  return NguyenduyBlurViewComponentView.class;
}
