#import "RCTMapView.h"
#import <MapKit/MapKit.h>

#import <react/renderer/components/RCTNativeMathSpec/ComponentDescriptors.h>
#import <react/renderer/components/RCTNativeMathSpec/EventEmitters.h>
#import <react/renderer/components/RCTNativeMathSpec/Props.h>
#import <react/renderer/components/RCTNativeMathSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

@interface RCTMapView () <MKMapViewDelegate>
@end

@implementation RCTMapView {
  MKMapView *_mapView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<MapViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const MapViewProps>();
    _props = defaultProps;

    _mapView = [[MKMapView alloc] initWithFrame:self.bounds];
    _mapView.delegate = self;
    self.contentView = _mapView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props
           oldProps:(Props::Shared const &)oldProps {
  const auto &oldViewProps = *std::static_pointer_cast<const MapViewProps>(_props);
  const auto &newViewProps = *std::static_pointer_cast<const MapViewProps>(props);

  if (oldViewProps.region.latitude != newViewProps.region.latitude ||
      oldViewProps.region.longitude != newViewProps.region.longitude ||
      oldViewProps.region.latitudeDelta != newViewProps.region.latitudeDelta ||
      oldViewProps.region.longitudeDelta != newViewProps.region.longitudeDelta) {
    MKCoordinateRegion region = MKCoordinateRegionMake(
      CLLocationCoordinate2DMake(newViewProps.region.latitude, newViewProps.region.longitude),
      MKCoordinateSpanMake(newViewProps.region.latitudeDelta, newViewProps.region.longitudeDelta)
    );
    [_mapView setRegion:region animated:YES];
  }

  [super updateProps:props oldProps:oldProps];
}

#pragma mark - MKMapViewDelegate

- (void)mapView:(MKMapView *)mapView regionDidChangeAnimated:(BOOL)animated {
  if (_eventEmitter == nullptr) {
    return;
  }
  auto eventEmitter = std::static_pointer_cast<const MapViewEventEmitter>(_eventEmitter);
  MapViewEventEmitter::OnRegionChange payload = {
    .latitude = mapView.region.center.latitude,
    .longitude = mapView.region.center.longitude,
    .latitudeDelta = mapView.region.span.latitudeDelta,
    .longitudeDelta = mapView.region.span.longitudeDelta,
  };
  eventEmitter->onRegionChange(payload);
}

@end

Class<RCTComponentViewProtocol> MapViewCls(void) {
  return RCTMapView.class;
}
