#import "NguyenduyBlurViewComponentView.h"

#import <react/renderer/components/NguyenduyBlurViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/NguyenduyBlurViewSpec/Props.h>
#import <react/renderer/components/NguyenduyBlurViewSpec/RCTComponentViewHelpers.h>

#import "RCTFabricComponentsPlugins.h"

#if __has_include(<NguyenduyBlur/NguyenduyBlur-Swift.h>)
#import <NguyenduyBlur/NguyenduyBlur-Swift.h>
#else
#import "NguyenduyBlur-Swift.h"
#endif

using namespace facebook::react;

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
    NSString *tintColor = newViewProps.tintColor.empty()
        ? nil
        : [NSString stringWithUTF8String:newViewProps.tintColor.c_str()];
    [_blurView setBlurTintColor:tintColor];
  }
  if (oldViewProps.cornerRadius != newViewProps.cornerRadius) {
    [_blurView setCornerRadius:newViewProps.cornerRadius];
  }

  [super updateProps:props oldProps:oldProps];
}

@end

Class<RCTComponentViewProtocol> NguyenduyBlurViewCls(void)
{
  return NguyenduyBlurViewComponentView.class;
}
