package com.margelo.nitro.math

import com.margelo.nitro.core.Promise
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class HybridMath : HybridMathSpec() {
  override val pi: Double
    get() = Math.PI

  override fun add(a: Double, b: Double): Double {
    return a + b
  }

  override fun fetchScore(userId: String): Promise<Double> {
    if (userId.isEmpty()) {
      throw RuntimeException("userId cannot be empty")
    }

    return Promise.async {
      delay(1000)
      (0..100).random().toDouble()
    }
  }

  override fun startWork(onProgress: (Double) -> Unit) {
    CoroutineScope(Dispatchers.Default).launch {
      for (i in 1..10) {
        delay(50)
        onProgress(i / 10.0)
      }
    }
  }
}
