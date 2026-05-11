# Exercise 04: Build a MapView with Nitro HybridView

> Reset your working tree to the `scaffold` tag (`git reset --hard scaffold`) and complete the steps below in your own checkout. Each task has a collapsible **Show solution** you can expand if you get stuck. The completed reference code for this exercise lives on the `04-nitro-component` branch (the same branch this README is on); once you finish, run `git diff 04-nitro-component` to see how your final state compares.

This exercise builds on the same map plumbing Exercise 03 used: `MapLibreInitializer` and `MapLifecycleBridge` from the scaffold's `android/app/.../maps/` package. Exercise 04 vendors a private copy of those two files inside the library so the library is self-contained. iOS uses Apple's `MKMapView` directly, no third-party dependency, no API key.

If you have done Exercise 02 (Nitro Math Module library), most of the library scaffolding will look familiar; the new content is the HybridView base class, the JS-side `callback()` wrapping for event props, the View Manager wiring on Android, and the iOS `view: UIView` accessor. If you have done Exercise 03 (MapView Fabric Component), the platform-specific map handling is identical; the new content is how the framework collapses Exercise 03's ViewManager + Codegen + manual event dispatcher into a single Kotlin class (on Android) or a single Swift class plus a small delegate bridge (on iOS).

## What you will build

A `HybridMapView` Nitro Component with one prop (`region`) and one event (`onRegionChange`) on both iOS and Android, distributed as a workspace package at `packages/nitro-mapview/`. By the end of the must-do steps, the Map tab shows a live map: iOS Apple Maps with full reactive `region` prop, Android OpenFreeMap Liberty with a one-time initial camera. Both platforms emit `onRegionChange` on user pan/zoom, which updates JS state, visible at the bottom of the screen.

## Why library, with HybridView

Nitro's tooling assumes library distribution. The `nitrogen` codegen, `nitro.json` autolinking, and the Pod/Gradle integration are all designed around a workspace package layout. App-level Nitro views aren't supported in any clean way; in practice, you put Nitro view code in a library every time.

The split across the workshop's four exercises:

- Exercise 01 — Math Turbo Module, **app-level**
- Exercise 02 — Math Nitro Module, **library** at `packages/nitro-math/`
- Exercise 03 — MapView Fabric Component, **app-level**
- Exercise 04 — MapView Nitro Component, **library** at `packages/nitro-mapview/`

The architectural axis is Turbo vs Nitro, not app-level vs library. Each side stays internally consistent.

---

## Step 1 (must-do): Scaffold the library

Create the package directory and four files inside it. The shape mirrors Exercise 02's `packages/nitro-math/`.

```
packages/nitro-mapview/
├── package.json
├── nitro.json
├── src/
│   └── MapView.nitro.ts
└── android/
    └── src/main/
        └── AndroidManifest.xml
```

### Task 1.1

Create `packages/nitro-mapview/package.json`:

<details>
<summary><kbd>Show solution</kbd></summary>

```json
{
  "name": "nitro-mapview",
  "version": "0.0.1",
  "main": "src/MapView.nitro.ts",
  "types": "src/MapView.nitro.ts",
  "files": [
    "src",
    "ios",
    "android",
    "nitrogen",
    "nitro.json",
    "*.podspec"
  ],
  "peerDependencies": {
    "react": "*",
    "react-native": "*",
    "react-native-nitro-modules": "*"
  }
}
```

Both `main` and `types` point at the spec file. The `files` array uses `"*.podspec"` glob to pick up `NitroMapView.podspec` (created in Step 3) at the package root.

</details>

### Task 1.2

Create `packages/nitro-mapview/nitro.json`:

<details>
<summary><kbd>Show solution</kbd></summary>

```json
{
  "cxxNamespace": ["nitromapview"],
  "ios": {
    "iosModuleName": "NitroMapView"
  },
  "android": {
    "androidNamespace": ["nitromapview"],
    "androidCxxLibName": "NitroMapView"
  },
  "autolinking": {
    "MapView": {
      "ios": {
        "language": "swift",
        "implementationClassName": "HybridMapView"
      },
      "android": {
        "language": "kotlin",
        "implementationClassName": "HybridMapView"
      }
    }
  }
}
```

</details>

Four things worth noticing about this config.

**Namespaces use a single segment.** `cxxNamespace: ["nitromapview"]` and `androidNamespace: ["nitromapview"]` produce clean `margelo::nitro::nitromapview` and `com.margelo.nitro.nitromapview` respectively. Nitrogen automatically prepends `margelo::nitro::` (C++) and `com.margelo.nitro.` (Kotlin) to whatever you specify, so adding your own prefix (e.g. `["nativemodulestraining", "nitromapview"]`) produces an awkward deeply-nested namespace `com.margelo.nitro.com.nativemodulestraining.nitromapview` that compiles but reads poorly. Match the Exercise 02 convention: one segment, the library's short name.

**Reserved name: `nitro`.** Don't include `nitro` as a segment in `cxxNamespace`; nitrogen errors out at codegen time with "This value is reserved and cannot be used!"

**Capitalization matters.** It's `iosModuleName` with a capital `N`. A common typo is `iosModulename` (lowercase n), which nitrogen reports as "must be string, but is undefined" because the lowercase key is silently ignored.

**Autolinking syntax.** The per-platform format with `ios` and `android` subobjects, each having `language` and `implementationClassName`, is the current convention. The older flat syntax (`"swift": "HybridMapView"`, `"kotlin": "HybridMapView"`) is deprecated and triggers a warning.

### Task 1.3

Create `packages/nitro-mapview/src/MapView.nitro.ts`. Declare the `Region` type, then a `HybridView` whose props include `region` and `onRegionChange`.

<details>
<summary><kbd>Show solution</kbd></summary>

```typescript
import type {
  HybridView,
  HybridViewMethods,
  HybridViewProps,
} from 'react-native-nitro-modules'

export interface Region {
  latitude: number
  longitude: number
  latitudeDelta: number
  longitudeDelta: number
}

export interface MapViewProps extends HybridViewProps {
  region?: Region
  onRegionChange?: (region: Region) => void
}

export interface MapViewMethods extends HybridViewMethods {}

export type MapView = HybridView<MapViewProps, MapViewMethods>
```

</details>

Four things worth noticing.

**Naming convention.** Nitrogen prepends `Hybrid` to your type name. The TypeScript export is `MapView`; the generated Swift abstract class is `HybridMapViewSpec`; the implementation class you write is `HybridMapView`. If you name your TS export `HybridMapView`, nitrogen generates `HybridHybridMapViewSpec` (double-prefix) — clearly wrong. The convention is unintuitive but consistent.

The spec is split into three pieces because Nitro distinguishes props (declarative state set from JSX) from methods (imperative calls invoked through a ref). MapView only has props; methods stay empty. If we wanted a programmatic `animateToRegion(region: Region)` call exposed via ref, we would add it to `MapViewMethods`.

`onRegionChange?: (region: Region) => void` declares the event as a callback function on the props. Nitro generates a stored function property on the platform side. There is no codegen-emitted event emitter, no `topRegionChange` mapping, and no manual `dispatchEvent` plumbing.

`HybridViewProps` extends an internal Nitro base type that adds layout-related props (style, etc.). You don't reference it in your own code, but it must be the parent of your prop interface or the codegen will not recognize the spec as a HybridView.

> Reference: deck slide 35.

### Task 1.4

Create `packages/nitro-mapview/android/src/main/AndroidManifest.xml`:

<details>
<summary><kbd>Show solution</kbd></summary>

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" />
```

</details>

The file is essentially empty (modern Android declares the namespace in `build.gradle` instead) but **must exist**. React Native's Android autolinking only treats a workspace package as an Android library if it has an `android/src/main/AndroidManifest.xml`. Without this file, `npx react-native config --platform android` shows your library's `platforms.android` as `null` and gradle never includes it as a subproject, even though everything else is wired up correctly.

---

## Step 2 (must-do): Generate bindings and register the package

With the spec in place, nitrogen generates platform binding code; the host app needs the new package added to its dependencies and the Nitro runtime as a direct dependency.

### Task 2.1

Add two entries to the root `package.json` `dependencies`:

<details>
<summary><kbd>Show solution</kbd></summary>

```json
"nitro-mapview": "file:./packages/nitro-mapview",
"react-native-nitro-modules": "0.35.6"
```

The `file:` protocol tells npm to resolve `nitro-mapview` from a local path. `react-native-nitro-modules` is the Nitro runtime — your library declares it as a peer dependency, but React Native's iOS autolinking only picks up **direct** dependencies of the host app. Without it as a direct dependency, the NitroModules iOS Pod is never installed and pod install fails with "Unable to find a specification for NitroModules".

After saving, install the codegen tool:

```bash
npm install --save-dev nitrogen
```

That installs `nitrogen` from the registry, resolves `nitro-mapview` locally, and pulls `react-native-nitro-modules` from the registry — all in one command.

</details>

### Task 2.2

Run nitrogen:

```bash
cd packages/nitro-mapview
npx nitrogen
cd ../..
```

Verify the output:

```bash
ls packages/nitro-mapview/nitrogen/generated/android/kotlin/com/margelo/nitro/nitromapview/
```

You should see `HybridMapViewSpec.kt` (the abstract class your Kotlin implementation will extend in Step 4), `NitroMapViewOnLoad.kt`, and a `views/` subdirectory containing `HybridMapViewManager.kt` (the View Manager that bridges Nitro to Fabric on Android).

If you see double-prefixed names like `HybridHybridMapViewSpec.kt`, your TypeScript spec type is named `HybridMapView` instead of `MapView` — nitrogen prepends `Hybrid` automatically. Rename per Task 1.3 and re-run.

If the command fails with "could not determine executable to run", `nitrogen` is not installed; revisit Task 2.1.

---

## Step 3 (must-do): Implement on iOS

Three files: a podspec at the **package root** that declares the library to CocoaPods (this location matters — React Native's autolinking searches the package root for `*.podspec`, not inside `ios/`), the Swift implementation, and a small extension that converts our `Region` struct to MapKit's `MKCoordinateRegion`.

Create `packages/nitro-mapview/NitroMapView.podspec` at the **package root**:

```ruby
require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "NitroMapView"
  s.version      = package["version"]
  s.summary      = "MapView Nitro Component for the React Native New Architecture workshop"
  s.homepage     = "https://github.com/callstack-workshops/native-modules-new-arch"
  s.license      = "MIT"
  s.authors      = "Callstack"
  s.platforms    = { :ios => "15.1" }
  s.source       = { :git => "https://github.com/callstack-workshops/native-modules-new-arch.git" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.frameworks   = "MapKit"

  load 'nitrogen/generated/ios/NitroMapView+autolinking.rb'
  add_nitrogen_files(s)

  s.dependency "React-Core"
  install_modules_dependencies(s)
end
```

Three things to notice about the podspec.

**Location matters.** The file lives at the package root (`packages/nitro-mapview/NitroMapView.podspec`), not inside `ios/`. React Native's iOS autolinking scans each dependency's root directory for a `*.podspec` file matching the package name. Placing it under `ios/` makes autolinking miss it entirely; pod install completes without errors but your library is never registered.

**Module-specific autolinking helper.** The `load 'nitrogen/generated/ios/NitroMapView+autolinking.rb'` line uses the module's specific autolinking filename — for our library `NitroMapView+autolinking.rb`. A common mistake is to use a generic `Nitro+autolinking.rb` name (taken from older Nitro docs); that file doesn't exist, and pod install errors with "cannot load such file".

**iOS deployment target.** `:ios => "15.1"` must be ≤ the host app's deployment target. Setting it higher (e.g. 16.0) causes pod install to error with "Specs satisfying the dependency were found, but they required a higher minimum deployment target."

Create `packages/nitro-mapview/ios/HybridMapView.swift`:

```swift
import Foundation
import MapKit
import NitroModules
import UIKit

class HybridMapView: HybridMapViewSpec {
  private let mapView = MKMapView()
  private let delegateBridge: MapDelegateBridge

  override init() {
    self.delegateBridge = MapDelegateBridge()
    super.init()
    mapView.delegate = delegateBridge
    delegateBridge.onRegionChanged = { [weak self] region in
      self?.onRegionChange?(region)
    }
  }

  // The required UIView accessor that hands the underlying view to the renderer.
  var view: UIView { mapView }

  // TODO 3.1: declare `region: Region?` with a didSet observer that calls
  //           mapView.setRegion(region.toMK(), animated: true) when non-nil

  // TODO 3.2: declare `onRegionChange: ((Region) -> Void)?` as a stored callback
}

private final class MapDelegateBridge: NSObject, MKMapViewDelegate {
  var onRegionChanged: ((Region) -> Void)?
  func mapView(_ mapView: MKMapView, regionDidChangeAnimated animated: Bool) {
    onRegionChanged?(Region(from: mapView.region))
  }
}
```

Create `packages/nitro-mapview/ios/Region+MK.swift`:

```swift
import MapKit

extension Region {
  init(from region: MKCoordinateRegion) {
    self.init(
      latitude: region.center.latitude,
      longitude: region.center.longitude,
      latitudeDelta: region.span.latitudeDelta,
      longitudeDelta: region.span.longitudeDelta
    )
  }

  func toMK() -> MKCoordinateRegion {
    MKCoordinateRegion(
      center: CLLocationCoordinate2D(latitude: latitude, longitude: longitude),
      span: MKCoordinateSpan(latitudeDelta: latitudeDelta, longitudeDelta: longitudeDelta)
    )
  }
}
```

### Task 3.1

Declare the `region` property: nullable `Region?` initialized to `nil`, with a `didSet` observer that applies the change to `mapView` when non-nil. The property is nullable because the TypeScript spec declared it with `?`, so nitrogen generated a `Region?` type on the platform side.

<details>
<summary><kbd>Show solution</kbd></summary>

```swift
  var region: Region? = nil {
    didSet {
      guard let region = region else { return }
      mapView.setRegion(region.toMK(), animated: true)
    }
  }
```

</details>

### Task 3.2

Declare `onRegionChange` as a stored optional callback:

<details>
<summary><kbd>Show solution</kbd></summary>

```swift
  var onRegionChange: ((Region) -> Void)? = nil
```

</details>

Six things worth noticing.

The class extends `HybridMapViewSpec`, which is a typealias for the protocol `HybridMapViewSpec_protocol` combined with the open base class `HybridMapViewSpec_base`. The generated protocol declares the property requirements (`region`, `onRegionChange`, plus `view` from the `HybridView` parent protocol); the base class provides initialization and the C++ wrapper machinery. Your implementation provides the actual property storage and the view accessor.

The properties are **not** marked `override` because they satisfy protocol requirements, not class members. Adding `override` to these properties causes a Swift compile error.

`init()` **is** marked `override` because the base class `HybridMapViewSpec_base` has a `public init()` you're providing your own implementation for.

`var view: UIView { mapView }` is the bridge between Nitro and UIKit. The renderer asks the HybridView class for the actual `UIView` to mount in the view hierarchy.

Each prop is its own typed setter. There is no `updateProps:oldProps:` method, no manual diffing, no C++ `Props` struct cast.

`MKMapViewDelegate` lives on a small `MapDelegateBridge` because Swift HybridView classes cannot directly conform to `@objc` protocols (the Nitrogen-generated parent class has constraints that make this awkward); the bridge is the standard workaround.

> Reference: deck slides 35, 36.

### Build check (recommended)

Before moving to Step 4, verify your iOS code compiles cleanly:

```bash
cd ios && bundle exec pod install && cd ..
npx react-native run-ios --simulator="iPhone 16"
```

What to expect:

- Pod install should include `Installing NitroMapView (0.0.1)` and `Installing NitroModules (0.35.6)` in its output.
- The build compiles `HybridMapView.swift`, `Region+MK.swift`, plus the nitrogen-generated `HybridMapViewSpec*.swift` and `Region.swift` files inside the pod.
- App launches; Map tab still shows the scaffold's placeholder text (Step 5 hasn't replaced it yet).

Common failure modes:

- **"Unable to find a specification for NitroModules"** — `react-native-nitro-modules` isn't a direct dependency of the host app. Re-check Task 2.1.
- **"Specs satisfying the dependency were found, but they required a higher minimum deployment target"** — your podspec's `:ios => "..."` is higher than the app's deployment target.
- **"cannot load such file -- nitrogen/generated/ios/NitroMapView+autolinking.rb"** — the podspec is in `ios/` instead of the package root, or you used a generic `Nitro+autolinking.rb` filename.

---

## Step 4 (must-do): Implement on Android

The Android side has substantially more moving parts than iOS because the Nitro runtime uses C++ via JNI, the View needs to register with Fabric's ViewManagerRegistry, and the package class plays a triple role (autolinking signal, library loader, View Manager exposer). Work through the tasks in order; the build will not succeed until all of them are done.

### Task 4.1

Vendor `MapLibreInitializer.kt` and `MapLifecycleBridge.kt` into the library:

<details>
<summary><kbd>Show solution</kbd></summary>

```bash
mkdir -p packages/nitro-mapview/android/src/main/java/com/margelo/nitro/nitromapview/
cp android/app/src/main/java/com/nativemodulestraining/maps/MapLibreInitializer.kt \
   packages/nitro-mapview/android/src/main/java/com/margelo/nitro/nitromapview/
cp android/app/src/main/java/com/nativemodulestraining/maps/MapLifecycleBridge.kt \
   packages/nitro-mapview/android/src/main/java/com/margelo/nitro/nitromapview/
```

Then edit both files: change the `package` declaration on line 1 from `package com.nativemodulestraining.maps` to `package com.margelo.nitro.nitromapview`. The `com.margelo.nitro.` prefix matches what nitrogen generates from your `androidNamespace`; co-locating your own classes in the same package eliminates imports.

</details>

### Task 4.2

Create `packages/nitro-mapview/android/build.gradle`:

<details>
<summary><kbd>Show solution</kbd></summary>

```gradle
buildscript {
  ext.safeExtGet = { prop, fallback ->
    rootProject.ext.has(prop) ? rootProject.ext.get(prop) : fallback
  }
}

apply plugin: 'com.android.library'
apply plugin: 'org.jetbrains.kotlin.android'
apply from: '../nitrogen/generated/android/NitroMapView+autolinking.gradle'

android {
  namespace "com.margelo.nitro.nitromapview"
  ndkVersion safeExtGet('ndkVersion', '27.1.12297006')
  compileSdkVersion safeExtGet('compileSdkVersion', 35)
  defaultConfig {
    minSdkVersion safeExtGet('minSdkVersion', 24)
    targetSdkVersion safeExtGet('targetSdkVersion', 35)
    externalNativeBuild {
      cmake {
        cppFlags "-frtti -fexceptions -Wall -Wextra"
        arguments "-DANDROID_STL=c++_shared"
      }
    }
  }
  externalNativeBuild {
    cmake {
      path "CMakeLists.txt"
    }
  }
  buildFeatures {
    prefab true
  }
}

dependencies {
  implementation 'com.facebook.react:react-android'
  implementation project(':react-native-nitro-modules')
  implementation 'org.maplibre.gl:android-sdk:11.11.0'
}
```

Three lines deserve attention.

**`apply from: '../nitrogen/generated/android/NitroMapView+autolinking.gradle'`** wires the nitrogen-generated gradle config into your build. It registers the C++ component descriptor and adds the generated Kotlin source directories.

**`implementation project(':react-native-nitro-modules')`** declares an explicit project dependency on the Nitro runtime library. This is what wires up the .so library loading order at runtime.

**`buildFeatures { prefab true }`** enables the Android Prefab format, which is how `react-native-nitro-modules` ships its precompiled C++ headers and shared libraries.

</details>

### Task 4.3

Create `packages/nitro-mapview/android/CMakeLists.txt`:

<details>
<summary><kbd>Show solution</kbd></summary>

```cmake
cmake_minimum_required(VERSION 3.22.1)

# Project name MUST match androidCxxLibName in nitro.json
project(NitroMapView)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Create the library target. autolinking.cmake adds the actual nitrogen sources
# via target_sources, but add_library requires at least one source file to start.
file(WRITE "${CMAKE_BINARY_DIR}/dummy.cpp"
  "// Placeholder source for NitroMapView. Real sources added by NitroMapView+autolinking.cmake.\n")
add_library(NitroMapView SHARED "${CMAKE_BINARY_DIR}/dummy.cpp")

# Include nitrogen's autolinking. CMAKE_SOURCE_DIR is android/ inside the library,
# and ../nitrogen/... resolves to the library's nitrogen/ folder.
include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/NitroMapView+autolinking.cmake)

# JNI_OnLoad. Required so System.loadLibrary("NitroMapView") triggers
# registerAllNatives(), which adds the "MapView" Hybrid Object to the registry
# JS later queries via getHostComponent('MapView').
target_sources(NitroMapView PRIVATE ${CMAKE_SOURCE_DIR}/src/main/cpp/cpp-adapter.cpp)
```

The dummy.cpp pattern is needed because CMake's `add_library` requires at least one source file at the point it's called, but autolinking.cmake adds all the real sources later via `target_sources`. Without the placeholder, `add_library` errors out before autolinking runs.

</details>

### Task 4.4

Create `packages/nitro-mapview/android/src/main/cpp/cpp-adapter.cpp`:

<details>
<summary><kbd>Show solution</kbd></summary>

```cpp
#include <jni.h>
#include <fbjni/fbjni.h>
#include "NitroMapViewOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return facebook::jni::initialize(vm, []() {
    margelo::nitro::nitromapview::registerAllNatives();
  });
}
```

This is invoked by Android's runtime when `System.loadLibrary("NitroMapView")` runs. Without `JNI_OnLoad`, the Nitro registry stays empty and your `HybridMapView` never gets registered. The lesson from Exercise 02 was hard-won: this file looks unimportant, and it is the single most common cause of "Nitro module not found" errors at runtime.

The header is `NitroMapViewOnLoad.hpp` (module-specific, not a generic `JNIOnLoad.hpp` from older Nitro docs); the function called is `registerAllNatives()`, not `initialize()`. These match what nitrogen generated based on your `cxxNamespace`.

</details>

### Task 4.5

Create `packages/nitro-mapview/android/src/main/java/com/margelo/nitro/nitromapview/Region+Camera.kt`:

<details>
<summary><kbd>Show solution</kbd></summary>

```kotlin
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
```

This is the inverse-pair from Exercise 03: `Region` → `CameraPosition` and `CameraPosition` → `Region`. Using these two helpers ensures the round-trip is symmetric, avoiding the feedback-loop bug Exercise 03 hit.

</details>

### Task 4.6

Create `packages/nitro-mapview/android/src/main/java/com/margelo/nitro/nitromapview/HybridMapView.kt`:

<details>
<summary><kbd>Show solution</kbd></summary>

```kotlin
package com.margelo.nitro.nitromapview

import android.view.View
import com.facebook.react.uimanager.ThemedReactContext
import org.maplibre.android.maps.MapView

class HybridMapView(val context: ThemedReactContext) : HybridMapViewSpec() {

  private val mapView: MapView

  init {
    MapLibreInitializer.ensureInitialized(context)
    mapView = MapView(context)
    mapView.onCreate(null)
    MapLifecycleBridge(context, mapView)

    mapView.getMapAsync { map ->
      map.setStyle("https://tiles.openfreemap.org/styles/liberty") {
        // Workaround: see "Known limitation" below the code block.
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
      value?.let { v ->
        mapView.getMapAsync { it.cameraPosition = v.toCameraPosition() }
      }
    }

  override var onRegionChange: ((Region) -> Unit)? = null
}
```

**Known limitation:** In Nitro 0.35.6 with RN 0.85.3, the `region` prop is not reliably delivered to the Kotlin setter on Android during initial mount. The fix is the hardcoded initial camera position inside the `setStyle` callback — which makes the map zoom to San Francisco the first time the screen loads, independent of whether the prop reaches the setter. The reactive `region` setter is still wired up correctly for the (rare) case where prop updates do arrive, and `onRegionChange` works fully bidirectionally. On iOS, the reactive `region` prop works as designed.

The `mapView` property is declared without an initializer and assigned in `init` after `MapLibreInitializer.ensureInitialized` runs. Order matters: MapLibre must be initialized before constructing a `MapView`.

</details>

### Task 4.7

Create `packages/nitro-mapview/android/src/main/java/com/margelo/nitro/nitromapview/NitroMapViewPackage.kt`:

<details>
<summary><kbd>Show solution</kbd></summary>

```kotlin
package com.margelo.nitro.nitromapview

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager
import com.margelo.nitro.JNIOnLoad
import com.margelo.nitro.nitromapview.views.HybridMapViewManager

/**
 * React Native package that does three things:
 *
 * 1. Provides a ReactPackage class for autolinking to discover. Without this
 *    class (and the AndroidManifest.xml from Task 1.4), React Native's Android
 *    autolinking silently skips this library.
 *
 * 2. Initializes the Nitro Modules and NitroMapView C++ libraries at app
 *    startup in the correct order: JNIOnLoad.initializeNativeNitro() creates
 *    the C++ HybridObjectRegistry, then NitroMapViewOnLoad.initializeNative()
 *    registers our HybridMapView into it.
 *
 * 3. Exposes the nitrogen-generated HybridMapViewManager via createViewManagers
 *    so Fabric finds "MapView" in its ViewManagerRegistry. Without this,
 *    getHostComponent('MapView') on the JS side throws "Can't find ViewManager
 *    'MapView' nor 'RCTMapView' in ViewManagerRegistry".
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
    return mutableListOf(HybridMapViewManager())
  }
}
```

This is the single most important file on the Android side. The class header comment lists its three responsibilities; missing any one of them produces a different symptom (silent autolinking skip, runtime crash on library load, or "Can't find ViewManager" error). All three must be there.

</details>

Five things worth noticing.

The user-written `HybridMapView` extends `HybridMapViewSpec()` (the Nitrogen-generated abstract class) directly. There is no `SimpleViewManager` subclass for **you** to write — nitrogen generates that for you. What you write is the `HybridMapView` class that exposes the actual platform view; the generated manager hands props from Fabric to your class and your class hands a `View` back to Fabric.

The constructor receives a `ThemedReactContext`, which is passed by Nitro's runtime when the view is mounted. This is where the entire view setup happens: MapLibre initialization, view creation, lifecycle bridge attachment, style loading, and event listener registration. There is no separate `createViewInstance` callback — the constructor IS that.

Each prop is a Kotlin property with a custom setter. When JS sets `region={someRegion}`, Nitro invokes the property setter on the UI thread with a typed `Region?` value.

`onRegionChange` is a stored nullable function reference (`((Region) -> Unit)?`). Calling it is a single line: `onRegionChange?.invoke(...)`. Compare with Exercise 03's manual `Event` subclass, surface ID lookup, and dispatcher invocation: about 20 lines of plumbing, replaced by one nullable function call.

The `nitro.json` `autolinking` block from Step 1 is what tells Nitro to instantiate this class when JS imports `MapView`. There is no equivalent of Exercise 03's `MapPackage` to register in `MainApplication.kt` — but `NitroMapViewPackage.kt` (Task 4.7) IS still a ReactPackage that React Native's autolinking discovers and registers.

> Reference: deck slides 37, 38.

### Build check (recommended)

After all the Android tasks, **clean rebuild fully** — Android's autolinking cache lives in `android/build/generated/autolinking/autolinking.json` and `./gradlew clean` does not always refresh it. The first time the library wires up correctly, you need to nuke this manually:

```bash
rm -rf android/build android/.gradle
cd android && ./gradlew clean && cd ..
npx react-native run-android
```

What to expect:

- Gradle output should include `Configure project :nitro-mapview` (this is the line that confirms autolinking actually picked up your library).
- C++ tasks `:nitro-mapview:buildCMakeDebug[arm64-v8a]` etc. should run for all four ABIs.
- `[NitroModules] 🔥 NitroMapView is boosted by nitro!` appears in the configuration phase.
- App launches; Map tab still shows the placeholder (Step 5 hasn't replaced it yet).

Common failure modes:

- **Build succeeds but no `:nitro-mapview` task appears in the output** — autolinking didn't pick up the library. Check the AndroidManifest.xml exists (Task 1.4), then `rm -rf android/build` and rebuild — the cached `autolinking.json` is stale.
- **CMake error: "include could not find requested file: ...NitroMapView+autolinking.cmake"** — wrong path. The include in `CMakeLists.txt` needs `${CMAKE_SOURCE_DIR}/../nitrogen/...` (Task 4.3), not without the `../`.
- **Kotlin: "Type of 'region' doesn't match the type of the overridden 'var' property 'var region: Region?'"** — your Kotlin region property is non-nullable, but the generated spec declares it nullable. Update to `Region?` (Task 4.6).
- **Runtime: "Can't find ViewManager 'MapView' nor 'RCTMapView' in ViewManagerRegistry"** — `NitroMapViewPackage` doesn't override `createViewManagers` to return `HybridMapViewManager`. Revisit Task 4.7.
- **Runtime: app crashes immediately with `UnsatisfiedLinkError: NitroMapView`** — cpp-adapter.cpp is missing, in the wrong path, or `CMakeLists.txt` doesn't reference it.

---

## Step 5 (must-do): Use the component from JavaScript

With the library compiled and registered on both platforms, render the Nitro view from `MapScreen.tsx`. The screen layout matches Exercise 03's exactly — same header, same full-bleed map, same region strip — so the visible difference between the Fabric and Nitro paths is zero. The implementation difference is significant.

Replace the contents of `src/screens/MapScreen.tsx`:

```tsx
import React, { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { getHostComponent, callback } from 'react-native-nitro-modules'
import type { MapViewProps, MapViewMethods, Region } from 'nitro-mapview'
import MapViewConfig from 'nitro-mapview/nitrogen/generated/shared/json/MapViewConfig.json'

// TODO 5.1: get the host component for the MapView spec via getHostComponent

const initialRegion: Region = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
}

export function MapScreen() {
  const [region, setRegion] = useState<Region>(initialRegion)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Map (Nitro)</Text>
        <Text style={styles.subtitle}>HybridView Component on the New Architecture</Text>
      </View>

      {/* TODO 5.2: render the host component with style fill, region prop,
                    and onRegionChange wrapped in callback() */}

      <View style={styles.regionStrip}>
        <View style={styles.regionRow}>
          <Text style={styles.regionLabel}>lat</Text>
          <Text style={styles.regionValue}>{region.latitude.toFixed(4)}</Text>
          <Text style={styles.regionLabel}>lng</Text>
          <Text style={styles.regionValue}>{region.longitude.toFixed(4)}</Text>
        </View>
        <View style={styles.regionRow}>
          <Text style={styles.regionLabel}>latDelta</Text>
          <Text style={styles.regionValue}>{region.latitudeDelta.toFixed(4)}</Text>
          <Text style={styles.regionLabel}>lngDelta</Text>
          <Text style={styles.regionValue}>{region.longitudeDelta.toFixed(4)}</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: { paddingTop: 12, paddingBottom: 12, paddingHorizontal: 16, gap: 4 },
  title: { fontSize: 28, fontWeight: '700', color: '#1C1C1E' },
  subtitle: { fontSize: 14, color: '#8E8E93' },
  regionStrip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C6C6C8',
    gap: 4,
  },
  regionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  regionLabel: { fontSize: 12, color: '#8E8E93', minWidth: 56 },
  regionValue: { fontSize: 13, color: '#1C1C1E', fontVariant: ['tabular-nums'], minWidth: 80 },
})
```

### Task 5.1

Get the typed host component for the MapView spec via `getHostComponent`. The function takes two type arguments (props and methods) and two value arguments (the autolinking name from `nitro.json`, and a callback returning the nitrogen-generated view config JSON):

<details>
<summary><kbd>Show solution</kbd></summary>

```tsx
const MapView = getHostComponent<MapViewProps, MapViewMethods>(
  'MapView',
  () => MapViewConfig
)
```

The lookup key (`'MapView'`) is the autolinking key declared in Step 1's `nitro.json` — it must match. The second argument is a factory function (not the value directly) because `getHostComponent` calls it lazily after the runtime has initialized.

The JSON import requires `resolveJsonModule: true` in your tsconfig — RN 0.85's default config has this on.

</details>

### Task 5.2

Render `<MapView>` between the header and the region strip. Pass `region={region}` and an `onRegionChange` handler — but wrap the handler in `callback()` from `react-native-nitro-modules`. Bare function references on HybridView event props do not propagate updates correctly through React Native's renderer; `callback()` is the wrapper that fixes that.

<details>
<summary><kbd>Show solution</kbd></summary>

```tsx
      <MapView
        style={{ flex: 1 }}
        region={region}
        onRegionChange={callback((r) => setRegion(r))}
      />
```

</details>

### Final integration test

Rebuild on both platforms (`npx react-native run-ios --simulator="iPhone 16"` and `npx react-native run-android`). Navigate to the Map tab.

- **iOS** should show Apple Maps centered on the Bay Area. Pan and zoom; the bottom strip's lat/lng/latDelta/lngDelta values should update each time the gesture settles.
- **Android** should show OpenFreeMap Liberty's vector basemap, also centered on the Bay Area (via the hardcoded initial camera in `HybridMapView.kt` — see Task 4.6's "Known limitation"). Pan and zoom; the bottom strip updates the same way iOS does.

> Reference: deck slide 39.

---

## Things worth noticing

The conceptual content from deck slides 36, 38, and 39 that does not become a TODO but matters once you start using HybridView in real apps.

**callback() wrapping.** This was Task 5.2's highlight. Bare function references on HybridView event props do not survive React Native's renderer correctly; `callback()` from `react-native-nitro-modules` produces a wrapped reference that does. Always wrap event-prop functions; never pass bare refs.

**Recyclable views.** When the HybridMapView renders inside a `FlatList` or list-based screen, React Native may recycle the underlying view across cells. Implement `RecyclableView`'s `prepareForRecycle()` to reset state (camera position, markers, gestures-in-progress). The default behavior is correct only for stateless views; map state leaks across cells without explicit reset. The workshop renders a single screen-filling MapView so this does not bite us, but in real list-based use cases this is the most common HybridView bug.

**Threading.** All UIKit work on iOS must run on the main thread; all `View` work on Android must run on the UI thread. Nitro invokes prop setters on the right thread automatically. Heavy work (image decoding, geometry computation, network requests) must be dispatched to a background queue, then back to the main/UI thread for the actual draw.

**Lifecycle and recycling on Android specifically.** The vendored `MapLifecycleBridge` handles the host (Activity) lifecycle. It does NOT handle view recycling: if the same `HybridMapView` instance is reassigned to a different cell in a list, the bridge stays attached to the old context. For list-based use cases, override `prepareForRecycle()` and call `bridge.detach()`, plus `mapView.onStop()` and `mapView.onDestroy()`.

**Autolinking via `getHostComponent`.** On the JS side, always import via `getHostComponent('YourViewName', () => YourViewConfig)` rather than the bare class. This gives the codegen-aware component with proper prop typing and correct rendering integration.

**RN 0.78+ required.** HybridView landed in React Native 0.78. Projects pinned to 0.77 or earlier must use Fabric (Exercise 03's path) for any new view code. Our workshop uses RN 0.85, so we are well above the minimum.

> Reference: deck slides 36, 38, 39.

---

## Compare with Exercise 03

Once both exercises are complete, switch between `03-turbo-component` and `04-nitro-component` and notice four things:

1. **File count vs file complexity.** Ex 03's iOS implementation needed `RCTMapView.h`, `RCTMapView.mm`, AND a TS spec calling `codegenNativeComponent`. Ex 04's iOS implementation is one Swift file plus a podspec. Ex 03's Android implementation needed `MapViewManager.kt`, `MapPackage.kt`, AND a `MainApplication.kt` registration. Ex 04's Android implementation has more individual files (build.gradle, CMakeLists, cpp-adapter, Package, HybridMapView) but no `MainApplication.kt` edit — the file growth is the cost of the library layout, not the framework.

2. **No diffing.** Ex 03's `updateProps:oldProps:` had to compare four `Region` fields manually before applying. Ex 04's prop setter only runs when the prop actually changes, and only with the new value.

3. **Direct callback vs event emitter.** Ex 03's Android event emission was 15 lines: build a `WritableMap` payload, look up the dispatcher, get the surface ID, dispatch via a custom `Event` subclass with a `topRegionChange` event name. Ex 04's Android event emission is one line: `onRegionChange?.invoke(...)`.

4. **Visual identity.** Both Map screens render identically (modulo the Android initial-region quirk). The framework choice is invisible to the user — and that is the lesson. The choice is about authoring ergonomics and version requirements, not user-facing behavior.

When you compare these in the integrated `00-final-app` branch (after Exercise 04 is integrated), the two Map tabs are deliberately near-identical screens; the only difference is the framework label in the header subtitle. Read both screens and the two view-implementation files side by side for the most concrete sense of the diff between Fabric and Nitro view authoring.
