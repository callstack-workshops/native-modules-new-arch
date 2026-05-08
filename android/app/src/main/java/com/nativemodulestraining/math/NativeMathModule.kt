package com.nativemodulestraining.math

import com.facebook.react.bridge.ReactApplicationContext

class NativeMathModule(reactContext: ReactApplicationContext) :
    NativeMathSpec(reactContext) {

  override fun getName(): String = NAME

  override fun add(a: Double, b: Double): Double = a + b

  override fun getTypedExportedConstants(): Map<String, Any> = mapOf("pi" to Math.PI)

  companion object {
    const val NAME = "Math"
  }
}
