#import "RCTNativeMath.h"

using namespace facebook::react;

@implementation RCTNativeMath

RCT_EXPORT_MODULE(Math)

- (NSDictionary *)getConstants {
  return @{@"pi": @(M_PI)};
}

- (NSNumber *)add:(double)a b:(double)b {
  NSNumber *result = @(a + b);
  [self emitOnValueChanged:result];
  return result;
}

- (void)fetchScore:(NSString *)userId
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject {
  if (userId.length == 0) {
    reject(@"empty_user_id", @"userId cannot be empty", nil);
    return;
  }

  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(1.0 * NSEC_PER_SEC)),
                 dispatch_get_global_queue(QOS_CLASS_DEFAULT, 0), ^{
    NSInteger score = arc4random_uniform(101);
    resolve(@(score));
  });
}

- (std::shared_ptr<TurboModule>)
    getTurboModule:(const ObjCTurboModule::InitParams &)params {
  return std::make_shared<NativeMathSpecJSI>(params);
}

@end
