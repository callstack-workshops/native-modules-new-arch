#import "RCTNativeMath.h"

using namespace facebook::react;

@implementation RCTNativeMath

RCT_EXPORT_MODULE(Math)

- (NSDictionary *)getConstants {
  return @{@"pi": @(M_PI)};
}

- (NSNumber *)add:(double)a b:(double)b {
  return @(a + b);
}

- (std::shared_ptr<TurboModule>)
    getTurboModule:(const ObjCTurboModule::InitParams &)params {
  return std::make_shared<NativeMathSpecJSI>(params);
}

@end
