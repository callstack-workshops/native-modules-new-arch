import Foundation
import MapKit
import NitroModules
import UIKit

class HybridMapView: HybridNitroMapViewSpec {
  private let mapView = MKMapView()
  private let delegateBridge: MapDelegateBridge

  override init() {
    self.delegateBridge = MapDelegateBridge()
    super.init()
    mapView.delegate = delegateBridge
    delegateBridge.onRegionChanged = { [weak self] region in
      self?.onRegionChange?(region)
    }
  }

  // The required UIView accessor that hands the underlying view to the renderer.
  var view: UIView { mapView }

  var region: Region? = nil {
    didSet {
      guard let region = region else { return }
      mapView.setRegion(region.toMK(), animated: true)
    }
  }

  var onRegionChange: ((Region) -> Void)? = nil
}

private final class MapDelegateBridge: NSObject, MKMapViewDelegate {
  var onRegionChanged: ((Region) -> Void)?
  func mapView(_ mapView: MKMapView, regionDidChangeAnimated animated: Bool) {
    onRegionChanged?(Region(from: mapView.region))
  }
}
