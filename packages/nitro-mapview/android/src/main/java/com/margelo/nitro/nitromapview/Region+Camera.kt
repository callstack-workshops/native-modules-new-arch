package com.margelo.nitro.nitromapview

import org.maplibre.android.camera.CameraPosition
import org.maplibre.android.geometry.LatLng

internal fun Region.toCameraPosition(): CameraPosition =
  CameraPosition.Builder()
    .target(LatLng(latitude, longitude))
    .zoom(approximateZoom(latitudeDelta))
    .build()

internal fun cameraToRegion(camera: CameraPosition): Region {
  val target = camera.target ?: LatLng(0.0, 0.0)
  val delta = 360.0 / Math.pow(2.0, camera.zoom)
  return Region(
    latitude = target.latitude,
    longitude = target.longitude,
    latitudeDelta = delta,
    longitudeDelta = delta
  )
}

private fun approximateZoom(latitudeDelta: Double): Double =
  (Math.log(360.0 / latitudeDelta) / Math.log(2.0)).coerceIn(1.0, 20.0)
