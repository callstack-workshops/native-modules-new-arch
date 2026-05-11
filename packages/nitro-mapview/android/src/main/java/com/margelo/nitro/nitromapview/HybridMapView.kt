package com.margelo.nitro.nitromapview

import android.view.View
import com.facebook.react.uimanager.ThemedReactContext
import org.maplibre.android.maps.MapView
import android.util.Log

class HybridMapView(val context: ThemedReactContext) : HybridMapViewSpec() {

  private val mapView: MapView

  init {
    MapLibreInitializer.ensureInitialized(context)
    mapView = MapView(context)
    mapView.onCreate(null)
    MapLifecycleBridge(context, mapView)

    mapView.getMapAsync { map ->
      map.setStyle("https://tiles.openfreemap.org/styles/liberty") {
        // Workaround: initial camera hardcoded here because HybridView prop
        // wiring on Android (Nitro 0.35.6 + RN 0.85.3) doesn't deliver props
        // reliably. iOS uses the reactive `region` prop normally.
        map.cameraPosition = Region(37.7749, -122.4194, 0.5, 0.5).toCameraPosition()
        map.addOnCameraIdleListener {
          onRegionChange?.invoke(cameraToRegion(map.cameraPosition))
        }
      }
    }
  }

  override val view: View = mapView

  override var region: Region? = null
    set(value) {
      field = value
      Log.d("HybridMapView", "Region setter called: $value")
      value?.let { v ->
        mapView.getMapAsync { map ->
          Log.d("HybridMapView", "Applying camera from setter: $v, zoom=${v.toCameraPosition().zoom}")
          map.cameraPosition = v.toCameraPosition()
        }
      }
    }

  override var onRegionChange: ((Region) -> Unit)? = null
}
