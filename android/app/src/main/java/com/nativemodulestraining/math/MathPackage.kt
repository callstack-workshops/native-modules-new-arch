package com.nativemodulestraining.math

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class MathPackage : BaseReactPackage() {

  override fun getModule(
    name: String,
    reactContext: ReactApplicationContext
  ): NativeModule? {
    return if (name == NativeMathModule.NAME) {
      NativeMathModule(reactContext)
    } else {
      null
    }
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    return ReactModuleInfoProvider {
      mapOf(
        NativeMathModule.NAME to ReactModuleInfo(
          NativeMathModule.NAME,
          NativeMathModule::class.java.name,
          false, // canOverrideExistingModule
          false, // needsEagerInit
          false, // isCxxModule
          true   // isTurboModule
        )
      )
    }
  }
}
