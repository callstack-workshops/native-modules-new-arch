package com.margelo.nitro.nitromapview

import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactContext
import org.maplibre.android.maps.MapView

class MapLifecycleBridge(
    private val reactContext: ReactContext,
    private val mapView: MapView,
) : LifecycleEventListener {

    init {
        reactContext.addLifecycleEventListener(this)
        mapView.onStart()
        mapView.onResume()
    }

    override fun onHostResume() {
        mapView.onResume()
    }

    override fun onHostPause() {
        mapView.onPause()
    }

    override fun onHostDestroy() {
        mapView.onPause()
        mapView.onStop()
        mapView.onDestroy()
    }

    fun detach() {
        reactContext.removeLifecycleEventListener(this)
    }
}
