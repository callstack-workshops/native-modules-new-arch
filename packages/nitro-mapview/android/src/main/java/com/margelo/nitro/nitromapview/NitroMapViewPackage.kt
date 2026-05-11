package com.margelo.nitro.nitromapview

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager
import com.margelo.nitro.JNIOnLoad
import com.margelo.nitro.nitromapview.views.HybridNitroMapViewManager

/**
 * React Native package that:
 * 1. Initializes the Nitro Modules and NitroMapView C++ libraries at app startup.
 * 2. Exposes the generated HybridMapViewManager so Fabric finds "MapView" in
 *    its ViewManagerRegistry. Without this, getHostComponent('MapView') on the
 *    JS side throws "Can't find ViewManager 'MapView'".
 */
class NitroMapViewPackage : BaseReactPackage() {
  init {
    JNIOnLoad.initializeNativeNitro()
    NitroMapViewOnLoad.initializeNative()
  }

  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? = null

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
    ReactModuleInfoProvider { mapOf() }

  override fun createViewManagers(reactContext: ReactApplicationContext): MutableList<ViewManager<*, *>> {
    return mutableListOf(HybridNitroMapViewManager())
  }
}
