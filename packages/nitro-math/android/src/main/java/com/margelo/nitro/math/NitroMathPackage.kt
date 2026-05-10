package com.margelo.nitro.math

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.margelo.nitro.JNIOnLoad

/**
 * React Native package whose only job is to initialize libNitroModules.so
 * and libNitroMath.so in the correct order at app startup.
 *
 * Why both, in this order:
 *
 * 1. JNIOnLoad.initializeNativeNitro() loads libNitroModules.so. Its
 *    JNI_OnLoad creates the C++ HybridObjectRegistry singleton.
 * 2. NitroMathOnLoad.initializeNative() loads libNitroMath.so. Its
 *    JNI_OnLoad (defined in cpp-adapter.cpp) calls registerAllNatives()
 *    which registers the "Math" HybridObject in the registry from step 1.
 *
 * Without step 1 first, NitroModules initializes lazily when JS imports
 * it, which is too late: our registration would land in a registry that
 * doesn't exist yet, and JS later finds an empty registry. Both methods
 * are idempotent; subsequent calls return immediately.
 */
class NitroMathPackage : BaseReactPackage() {
  init {
    JNIOnLoad.initializeNativeNitro()
    NitroMathOnLoad.initializeNative()
  }

  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? = null

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
    ReactModuleInfoProvider { mapOf() }
}
