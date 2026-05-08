package com.nativemodulestraining.math

import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext

class NativeMathModule(reactContext: ReactApplicationContext) :
    NativeMathSpec(reactContext) {

  override fun getName(): String = NAME

  override fun add(a: Double, b: Double): Double {
    val result = a + b
    emitOnValueChanged(result)
    return result
  }

  override fun getTypedExportedConstants(): Map<String, Any> = mapOf("pi" to Math.PI)

  override fun fetchScore(userId: String, promise: Promise) {
    if (userId.isEmpty()) {
      promise.reject("empty_user_id", "userId cannot be empty")
      return
    }

    Handler(Looper.getMainLooper()).postDelayed({
      val score = (0..100).random()
      promise.resolve(score)
    }, 1000L)
  }

  companion object {
    const val NAME = "Math"
  }
}
