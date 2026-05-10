package com.nativemodulestraining.maps

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.Event
import com.facebook.react.viewmanagers.MapViewManagerDelegate
import com.facebook.react.viewmanagers.MapViewManagerInterface
import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.geometry.LatLng
import org.maplibre.android.maps.MapLibreMap
import org.maplibre.android.maps.MapView

class MapViewManager : SimpleViewManager<MapView>(), MapViewManagerInterface<MapView> {

  private val delegate = MapViewManagerDelegate(this)

  override fun getDelegate() = delegate

  override fun getName() = "MapView"

  override fun createViewInstance(context: ThemedReactContext): MapView {
    MapLibreInitializer.ensureInitialized(context)
    val mapView = MapView(context)
    mapView.onCreate(null)
    MapLifecycleBridge(context, mapView)

    mapView.getMapAsync { map ->
      map.setStyle("https://tiles.openfreemap.org/styles/liberty")
      map.addOnCameraIdleListener {
        emitRegionChange(mapView, map)
      }
    }

    return mapView
  }

  @ReactProp(name = "region")
  override fun setRegion(view: MapView, value: ReadableMap?) {
    if (value == null) return
    val lat = value.getDouble("latitude")
    val lng = value.getDouble("longitude")
    val latDelta = value.getDouble("latitudeDelta")
    val zoom = approximateZoom(latDelta)
    view.getMapAsync { map ->
      map.cameraPosition = CameraPosition.Builder()
        .target(LatLng(lat, lng))
        .zoom(zoom)
        .build()
    }
  }

  private fun emitRegionChange(view: MapView, map: MapLibreMap) {
    val context = view.context as? ReactContext ?: return
    val cam = map.cameraPosition
    val target = cam.target ?: return
    val latDelta = 360.0 / Math.pow(2.0, cam.zoom)
    val lngDelta = latDelta

    val payload = Arguments.createMap().apply {
      putDouble("latitude", target.latitude)
      putDouble("longitude", target.longitude)
      putDouble("latitudeDelta", latDelta)
      putDouble("longitudeDelta", lngDelta)
    }

    val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, view.id)
    val surfaceId = UIManagerHelper.getSurfaceId(view)
    dispatcher?.dispatchEvent(OnRegionChangeEvent(surfaceId, view.id, payload))
  }

  private class OnRegionChangeEvent(
    surfaceId: Int,
    viewTag: Int,
    private val payload: WritableMap,
  ) : Event<OnRegionChangeEvent>(surfaceId, viewTag) {
    override fun getEventName() = "topRegionChange"
    override fun getEventData(): WritableMap = payload
  }

  private fun approximateZoom(latitudeDelta: Double): Double =
    (Math.log(360.0 / latitudeDelta) / Math.log(2.0)).coerceIn(1.0, 20.0)
}
