# Exercise 03: Build a MapView with Fabric Components

> Reset your working tree to the `scaffold-v1` tag (`git reset --hard scaffold-v1`) and complete the steps below in your own checkout. Each task has a collapsible **Show solution** you can expand if you get stuck. The completed reference code for this exercise lives on the `03-turbo-component` branch (the same branch this README is on); once you finish, run `git diff 03-turbo-component` to see how your final state compares.

This exercise builds on the Map plumbing already in `scaffold-v1`: `android/app/src/main/java/com/nativemodulestraining/maps/MapLibreInitializer.kt` (thread-safe MapLibre init) and `MapLifecycleBridge.kt` (proxies React Native host lifecycle into the MapView's onStart/onResume/onPause/onStop/onDestroy). You do not need to learn MapLibre's lifecycle quirks; the workshop authors handled that so you can focus on the Fabric authoring story. On iOS we use Apple's `MKMapView` directly, no third-party dependency, no API key, no lifecycle bridge needed.

## What you will build

A `MapView` Fabric Component with one prop (`region`) and one event (`onRegionChange`) on both iOS and Android. By the end of the must-do steps (1 through 5), the Map tab shows a live, pannable, zoomable map. Programmatic `region` changes from JS animate the camera; user pan/zoom interactions fire `onRegionChange` events that update JS state, displayed live at the bottom of the screen.

This is the Fabric (Turbo) path. Exercise 04 builds the same view as a Nitro `HybridView` for direct comparison.

## Why app-level, not library

Exercise 02 forced a library-shaped layout because Nitro's tooling assumes library distribution and integrating Nitro at app level is documented as rocky territory. Fabric Components have no such constraint. App-level matches Exercise 01's pattern (single-app Turbo Module) so the Ex 01 / Ex 03 pairing on the Turbo side is symmetric, and the Ex 02 / Ex 04 pairing on the Nitro side is symmetric. The architectural axis the workshop teaches is Turbo vs. Nitro, not app-level vs. library; keeping each side internally consistent makes that axis sharper.

---

## Step 1 (must-do): Configure codegen

The `scaffold-v1` tag predates any codegen setup, so you need to add a `codegenConfig` block to `package.json` from scratch. (If you have done Exercise 01 first, the block is already there from that exercise's Step 2; one field needs to change. See the note at the end of this step.)

### Task 1.1

Add a `codegenConfig` section at the top level of `package.json` (sibling of `dependencies`, `scripts`, etc.):

<details>
<summary><kbd>Show solution</kbd></summary>

```json
"codegenConfig": {
  "name": "RCTNativeMathSpec",
  "type": "all",
  "jsSrcsDir": "src/specs",
  "android": {
    "javaPackageName": "com.nativemodulestraining.math"
  },
  "ios": {
    "componentProvider": {
      "MapView": "RCTMapView"
    }
  }
}
```

</details>

Field by field.

`name` is the prefix for generated files: it becomes the header library on iOS (`#import <react/renderer/components/RCTNativeMathSpec/...>`) and the codegen Java/Kotlin package suffix on Android. The `RCT` prefix is React Native convention; the `Spec` suffix is required.

The name `RCTNativeMathSpec` is a deliberate carry-over from Exercise 01: the same `codegenConfig` covers both the Math Turbo Module from Exercise 01 and the MapView Fabric Component from this exercise, and renaming it later would break Exercise 01's iOS imports. The name is technically a misnomer (it suggests "Math" but the spec library now hosts both Math and MapView), but it is a string identifier rather than a description; production apps usually pick a more general name like `<AppName>Spec` from the start.

`type: "all"` makes codegen scan `jsSrcsDir` for both `Native*.ts` (module specs) AND `*NativeComponent.ts` (component specs). The other valid values are `modules` and `components`. Without `all`, your Step 2 component spec is silently ignored and you spend an hour debugging a missing component before realizing one line of JSON is wrong.

`jsSrcsDir: "src/specs"` is where codegen scans for spec files. We use `src/specs` because that is where you will place `MapViewNativeComponent.ts` in Step 2.

`android.javaPackageName` is the Java/Kotlin package the generated Android module specs live in. This applies only to module specs (Exercise 01's `NativeMathSpec`); view manager interfaces are always generated under `com.facebook.react.viewmanagers` regardless of this setting.

`ios.componentProvider` is what wires your iOS Fabric component into the runtime registry. The map `"MapView": "RCTMapView"` says "the JS-side component named `MapView` is implemented by the iOS class `RCTMapView`". Codegen reads this and adds your class to the auto-generated `RCTThirdPartyComponentsProvider.mm`, which RN queries at startup. Without this entry, your `RCTMapView` class compiles and the C function `MapViewCls()` exists, but Fabric's component registry never learns about either, so JSX referencing `<MapView>` renders the pink "Unimplemented component" placeholder. This block is required for every app-level Fabric Component; one entry per component.

### Already done Exercise 01?

If your `package.json` already has a `codegenConfig` from Exercise 01 with `"type": "modules"`, change that one field to `"type": "all"`. Leave everything else alone.

After the change, regenerate iOS bindings:

```bash
cd ios && bundle exec pod install && cd ..
```

The Android codegen reruns automatically on the next gradle build.

> Reference: deck slide 34, right panel.

---

## Step 2 (must-do): Write the TypeScript spec

Codegen recognizes Fabric component specs by filename suffix. The conventions are: the file ends with `NativeComponent.ts`, default-exports a call to `codegenNativeComponent`, and the registered component name passed to `codegenNativeComponent` matches the native class name on both platforms.

Create `src/specs/MapViewNativeComponent.ts` with this skeleton:

```typescript
import type { ViewProps, HostComponent } from 'react-native';
import type {
  Double,
  DirectEventHandler,
} from 'react-native/Libraries/Types/CodegenTypes';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

export type Region = Readonly<{
  latitude: Double;
  longitude: Double;
  latitudeDelta: Double;
  longitudeDelta: Double;
}>;

export interface NativeProps extends ViewProps {
  // TODO 2.1
}

export default codegenNativeComponent<NativeProps>('MapView') as HostComponent<NativeProps>;
```

### Task 2.1

Declare two members on `NativeProps`:

- `region` (optional): a `Region`
- `onRegionChange` (optional): a `DirectEventHandler<Region>`

<details>
<summary><kbd>Show solution</kbd></summary>

```typescript
  region?: Region;
  onRegionChange?: DirectEventHandler<Region>;
```

</details>

### What is a Region

The `Region` type models a rectangular area of the map. `latitude` and `longitude` define the center of the visible area. `latitudeDelta` and `longitudeDelta` define how much of the map is visible, in degrees: a `latitudeDelta` of 0.5 spans roughly 55 km north-south, 0.01 zooms in to street level, 10 zooms out to most of California. The bottom strip you will see in Step 5's MapScreen displays these four values live, so as you pan and zoom the map you can watch them update.

This is iOS's `MKCoordinateRegion` shape (center + span), which is why the Region API maps cleanly to MapKit. Android's MapLibre uses center + zoom rather than center + spans, so the Android implementation in Step 4 derives a zoom level from `latitudeDelta`. That conversion is lossy (the visible aspect ratio shifts the actual span MapLibre renders), but visually close enough for the workshop.

Three things worth noticing.

`Double` from `CodegenTypes` is required, not plain `number`. Codegen treats raw `number` as ambiguous in some contexts, and `Double` makes the intent explicit on both platforms (becomes `double` in C++, `Double` in Kotlin, `Double` in Swift). The same goes for `Float`, `Int32`, etc. when you need them.

`DirectEventHandler<Region>` declares a typed event whose payload shape is `Region`. The "Direct" part means the event does not bubble through the native view hierarchy; for view-internal events like region change, that is what you want. The alternative `BubblingEventHandler` is for events that should propagate to ancestors, which is rare in practice.

The string `'MapView'` passed to `codegenNativeComponent` is what the native side registers under. It must match the iOS class registration (Step 3) and the Android `getName()` return value (Step 4). Drift here produces a silent runtime failure where the JSX renders nothing and the React DevTools shows `<MapView>` as an unrenderable component.

After this change, regenerate the iOS bindings:

```bash
cd ios && bundle exec pod install && cd ..
```

The Android codegen reruns automatically on the next gradle build. After the iOS regen, you can confirm component headers exist:

```bash
ls ios/build/generated/ios/ReactCodegen/react/renderer/components/RCTNativeMathSpec/
```

You should see `ComponentDescriptors.h`, `EventEmitters.h`, `Props.h`, `RCTComponentViewHelpers.h`, and `ShadowNodes.h`. If the directory does not exist, your `codegenConfig.type` change in Step 1 did not stick (verify with `grep -A1 codegenConfig package.json`), or the file does not end with `NativeComponent.ts` (codegen is strict about the suffix).

> Reference: deck slide 34, right panel.

---

## Step 3 (must-do): Implement on iOS

A Fabric Component on iOS is two files: a thin header that declares the class, and an Objective-C++ (`.mm`) implementation that wraps a UIKit view, handles prop updates, and emits events. The class extends `RCTViewComponentView` from `<React/RCTViewComponentView.h>`.

Both files go in `ios/NativeModulesTraining/`, alongside Exercise 01's `RCTNativeMath.{h,mm}`.

Create `ios/NativeModulesTraining/RCTMapView.h`:

```objc
#import <React/RCTViewComponentView.h>

NS_ASSUME_NONNULL_BEGIN

@interface RCTMapView : RCTViewComponentView
@end

NS_ASSUME_NONNULL_END
```

Create `ios/NativeModulesTraining/RCTMapView.mm` with this skeleton:

```objc
#import "RCTMapView.h"
#import <MapKit/MapKit.h>

#import <react/renderer/components/RCTNativeMathSpec/ComponentDescriptors.h>
#import <react/renderer/components/RCTNativeMathSpec/EventEmitters.h>
#import <react/renderer/components/RCTNativeMathSpec/Props.h>
#import <react/renderer/components/RCTNativeMathSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

@interface RCTMapView () <MKMapViewDelegate>
@end

@implementation RCTMapView {
  MKMapView *_mapView;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<MapViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const MapViewProps>();
    _props = defaultProps;

    _mapView = [[MKMapView alloc] initWithFrame:self.bounds];
    _mapView.delegate = self;
    self.contentView = _mapView;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props
           oldProps:(Props::Shared const &)oldProps {
  const auto &oldViewProps = *std::static_pointer_cast<const MapViewProps>(_props);
  const auto &newViewProps = *std::static_pointer_cast<const MapViewProps>(props);

  // TODO 3.1: detect a region change and apply it to _mapView

  [super updateProps:props oldProps:oldProps];
}

#pragma mark - MKMapViewDelegate

- (void)mapView:(MKMapView *)mapView regionDidChangeAnimated:(BOOL)animated {
  // TODO 3.2: emit onRegionChange with the current map region
}

@end

Class<RCTComponentViewProtocol> MapViewCls(void) {
  return RCTMapView.class;
}
```

### Task 3.1

In `updateProps:`, detect whether any of the four `Region` fields changed between `oldViewProps.region` and `newViewProps.region`, and if so, apply the new region to `_mapView` via `setRegion:animated:`. Use `MKCoordinateRegionMake` with `MKCoordinateSpanMake` to convert.

<details>
<summary><kbd>Show solution</kbd></summary>

```objc
  if (oldViewProps.region.latitude != newViewProps.region.latitude ||
      oldViewProps.region.longitude != newViewProps.region.longitude ||
      oldViewProps.region.latitudeDelta != newViewProps.region.latitudeDelta ||
      oldViewProps.region.longitudeDelta != newViewProps.region.longitudeDelta) {
    MKCoordinateRegion region = MKCoordinateRegionMake(
      CLLocationCoordinate2DMake(newViewProps.region.latitude, newViewProps.region.longitude),
      MKCoordinateSpanMake(newViewProps.region.latitudeDelta, newViewProps.region.longitudeDelta)
    );
    [_mapView setRegion:region animated:YES];
  }
```

</details>

### Task 3.2

In `mapView:regionDidChangeAnimated:`, emit `onRegionChange` via the Fabric event emitter. The pattern is: cast `_eventEmitter` to a `MapViewEventEmitter` and call `onRegionChange` with a struct payload. Bail early if `_eventEmitter == nullptr` because the view might fire delegate callbacks before being mounted.

<details>
<summary><kbd>Show solution</kbd></summary>

```objc
  if (_eventEmitter == nullptr) {
    return;
  }
  auto eventEmitter = std::static_pointer_cast<const MapViewEventEmitter>(_eventEmitter);
  MapViewEventEmitter::OnRegionChange payload = {
    .latitude = mapView.region.center.latitude,
    .longitude = mapView.region.center.longitude,
    .latitudeDelta = mapView.region.span.latitudeDelta,
    .longitudeDelta = mapView.region.span.longitudeDelta,
  };
  eventEmitter->onRegionChange(payload);
```

</details>

Three things worth noticing.

`RCTViewComponentView` is the base class for Fabric components on iOS. It owns the `_props` and `_eventEmitter` ivars; you do not declare them. `_props` is the immutable current props snapshot; `_eventEmitter` is the typed emitter codegen generated from your TypeScript spec. The skeleton casts use `_props` for the "old" props rather than the `oldProps` argument because `oldProps` can be null on first mount (no previous state to compare against), and dereferencing it crashes. `_props` is guaranteed non-null because we initialize it in `initWithFrame:` with default props, and `RCTViewComponentView` keeps it pointing at the current props throughout the view's lifetime.

`updateProps:oldProps:` is invoked on every prop diff. The C++ struct types `MapViewProps` and `MapViewEventEmitter::OnRegionChange` are generated by codegen at `<react/renderer/components/RCTNativeMathSpec/...>`. The members match your TS spec one-to-one; if you rename `region` to `coordinate` in the TS file, both struct names update on the next pod install.

`MapViewCls()` at the bottom of the file is a C function that React Native calls to instantiate this component class. The naming is mechanical: the registered name from your TS spec (`'MapView'`) plus the suffix `Cls`. The function's existence is necessary but not sufficient; it gets wired into the Fabric component registry through the `ios.componentProvider` entry you added in Step 1's `codegenConfig`. Without that entry, `MapViewCls()` compiles, links, and is callable, but the registry never queries it, so JSX rendering `<MapView>` produces the pink "Unimplemented component" placeholder. Step 1 + Step 3 together register the component; missing either is a silent-failure mode.

### Add the files to Xcode

Open `ios/NativeModulesTraining.xcworkspace`. Drag both files from Finder into the `NativeModulesTraining` group in the Project Navigator. In the "Add Files to Project" dialog, set "Action" to **Reference files in place**, and make sure the `NativeModulesTraining` target is checked. Click **Don't Create** if it prompts about a Swift bridging header.

After adding, run the pre-flight check:

```bash
find ios -name "RCTMapView.*" -not -path "*/build/*"
```

You should see exactly two paths, both inside `ios/NativeModulesTraining/`. If you see four, you accidentally chose "Copy files to destination"; delete the duplicates and re-add with "Reference files in place" (same fix as Exercise 01).

### Link MapKit.framework

`MKMapView` lives in Apple's MapKit framework. The headers compile from the SDK without any extra setup, but the linker cannot find the class implementation unless MapKit is explicitly added to the app target's linked frameworks. (System frameworks like UIKit and Foundation are linked automatically; less-common ones like MapKit are not.)

In Xcode (`ios/NativeModulesTraining.xcworkspace`):

1. Select the `NativeModulesTraining` project in the Project Navigator (top entry, blue icon)
2. Select the `NativeModulesTraining` **target** (not the project)
3. Go to the **General** tab
4. Scroll to **Frameworks, Libraries, and Embedded Content**
5. Click the **+** button below the list
6. Search for **MapKit**, select **MapKit.framework**, click **Add**
7. Leave the embed setting at **Do Not Embed** (it is a system framework, present on the device already)

Without this step, your build compiles fine but fails at link time with `Undefined symbols for architecture arm64: _OBJC_CLASS_$_MKMapView`. The error looks completely unrelated to the source code, which makes it easy to misdiagnose.

> Reference: deck slide 35, right panel.

---

## Step 4 (must-do): Implement on Android

A Fabric Component on Android is three pieces: a `SimpleViewManager` subclass that creates and configures the native View, a `BaseReactPackage` (or plain `ReactPackage`) that exposes the manager to React Native, and one line added to `MainApplication.kt` to register the package.

Create `android/app/src/main/java/com/nativemodulestraining/maps/MapViewManager.kt` with this skeleton:

```kotlin
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
    // TODO 4.1: initialize MapLibre, create the MapView, attach the lifecycle
    //           bridge, set a tile style, and wire the camera-idle listener
    //           that emits onRegionChange.
  }

  @ReactProp(name = "region")
  override fun setRegion(view: MapView, value: ReadableMap?) {
    // TODO 4.2: animate the map camera to the requested region
  }

  private fun emitRegionChange(view: MapView, map: MapLibreMap) {
    val context = view.context as? ReactContext ?: return
    // TODO 4.3: build the onRegionChange payload and dispatch it
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
```

### Task 4.1

Implement `createViewInstance`. The sequence is: ensure MapLibre is initialized via `MapLibreInitializer.ensureInitialized(context)`, instantiate `MapView(context)`, call `mapView.onCreate(null)`, attach a `MapLifecycleBridge(context, mapView)`, set a tile style URL via `mapView.getMapAsync { ... map.setStyle("https://demotiles.maplibre.org/style.json") ... }`, and inside that same `getMapAsync` block install an `addOnCameraIdleListener` that calls `emitRegionChange(mapView, map)`.

<details>
<summary><kbd>Show solution</kbd></summary>

```kotlin
    MapLibreInitializer.ensureInitialized(context)
    val mapView = MapView(context)
    mapView.onCreate(null)
    MapLifecycleBridge(context, mapView)

    mapView.getMapAsync { map ->
      map.setStyle("https://demotiles.maplibre.org/style.json")
      map.addOnCameraIdleListener {
        emitRegionChange(mapView, map)
      }
    }

    return mapView
```

</details>

### Task 4.2

Implement `setRegion`. Read `latitude`, `longitude`, and `latitudeDelta` from the `ReadableMap`, derive a zoom from the latitude delta via `approximateZoom`, and apply via `view.getMapAsync { map -> map.cameraPosition = CameraPosition.Builder()...build() }`.

<details>
<summary><kbd>Show solution</kbd></summary>

```kotlin
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
```

</details>

### Task 4.3

Implement `emitRegionChange`. Build a `WritableMap` payload with the four `Region` fields and dispatch it through `UIManagerHelper.getEventDispatcherForReactTag(context, view.id)`. For latitude/longitude, read from `map.cameraPosition.target` (with a null-safe `?: return` in case the target is null during initial layout). For the deltas, derive them from `cam.zoom` as the inverse of `approximateZoom`: `360.0 / 2^zoom` — this is a simplification (it ignores the view's aspect ratio), but it keeps the input/output of the round-trip symmetric, which avoids a subtle feedback loop where `onRegionChange` emits values that drift each cycle.

<details>
<summary><kbd>Show solution</kbd></summary>

```kotlin
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
```

</details>

Three things worth noticing.

`MapViewManagerInterface<MapView>` and `MapViewManagerDelegate` are codegen-generated from your TypeScript spec. The interface declares one method per prop (`setRegion`); your manager implements them. The delegate is what React Native's runtime calls into to apply props; it forwards to your manager. Both live under the package `com.facebook.react.viewmanagers`, generated into `android/app/build/generated/source/codegen/`.

The event name for codegen-bound `DirectEventHandler` props is the prop name with a `top` prefix: `onRegionChange` becomes `topRegionChange` in the dispatcher. Codegen produces a JS-side wrapper that translates `top` events into the friendly `on` name before they reach your component handler. If you see `onRegionChange` never firing in JS but `topRegionChange` firing in the React DevTools event log, the codegen-generated mapping did not run; check that your spec file ends with `NativeComponent.ts` and that `pod install` succeeded after Step 2.

The `cameraPosition` setter on MapLibre is asynchronous in effect: `getMapAsync` returns immediately, and the callback runs once the map is ready. If you call `setRegion` from JS before the map has loaded, the camera update is queued and applied when ready. This is fine for the workshop; in production you would want a loading state for any UI that depends on the map being interactive.

### Add the package and register it

Create `android/app/src/main/java/com/nativemodulestraining/maps/MapPackage.kt`:

```kotlin
package com.nativemodulestraining.maps

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class MapPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> = emptyList()
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    listOf(MapViewManager())
}
```

Plain `ReactPackage` is used here rather than `BaseReactPackage` because we are registering a view manager (not a Turbo Module). `BaseReactPackage`'s API is module-shaped; `ReactPackage`'s `createViewManagers` is the classical entry point for view managers and works fine with Fabric.

Register the package in `android/app/src/main/java/com/nativemodulestraining/MainApplication.kt`. Find the `getPackages()` method (which already includes `MathPackage()` from Exercise 01 if you have done it) and add `MapPackage()`:

```kotlin
override fun getPackages(): List<ReactPackage> =
    PackageList(this).packages.apply {
      add(MathPackage())  // from Exercise 01, if present
      add(MapPackage())
    }
```

Add the matching import at the top:

```kotlin
import com.nativemodulestraining.maps.MapPackage
```

Without that registration line, your component compiles fine but never appears in the view-manager registry, and JSX renders an empty placeholder. Same failure mode as forgetting `MathPackage()` in Exercise 01.

> Reference: deck slide 37, right panel.

---

## Step 5 (must-do): Use the component from JavaScript

With the component registered on both platforms, render it from `MapScreen.tsx`. The map is the demo here, not a row in a list, so the layout is full-bleed: header at top, map fills the middle, a small region-info strip at the bottom shows the current camera live.

Replace the contents of `src/screens/MapScreen.tsx` with this skeleton:

```tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
// TODO 5.1: import the codegen-generated MapView component and its Region type

const initialRegion: Region = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

export function MapScreen() {
  const [region, setRegion] = useState<Region>(initialRegion);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Map</Text>
        <Text style={styles.subtitle}>Fabric Component on the New Architecture</Text>
      </View>

      {/* TODO 5.2: render <MapView> with style fill, the region prop,
                    and onRegionChange wiring setRegion(e.nativeEvent) */}

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
  );
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
});
```

### Task 5.1

Import the `MapView` default export and the `Region` type from your spec file.

<details>
<summary><kbd>Show solution</kbd></summary>

```tsx
import MapView, { type Region } from '../specs/MapViewNativeComponent';
```

</details>

### Task 5.2

Render `<MapView>` between the header and the region strip. It should fill the available space (`style={{ flex: 1 }}`), receive the current `region` as a prop, and update `region` state when `onRegionChange` fires.

<details>
<summary><kbd>Show solution</kbd></summary>

```tsx
      <MapView
        style={{ flex: 1 }}
        region={region}
        onRegionChange={(e) => setRegion(e.nativeEvent)}
      />
```

</details>

The `e.nativeEvent` is the typed `Region` payload your native code emitted. With `DirectEventHandler<Region>`, codegen generates the wrapper that hands the JS handler a synthetic-event-like object whose `nativeEvent` is the typed payload. Setting `region` from inside `onRegionChange` is intentional: the user pans the map, native fires `regionDidChange`, JS state updates, and the region strip at the bottom updates live. Programmatic region changes (from a button or external state) flow the other direction: JS updates `region`, prop diff triggers `updateProps` natively, the camera animates.

> Checkpoint after Step 5: rebuild on both platforms (`npx react-native run-ios --simulator="iPhone 16"` and `npx react-native run-android`). Navigate to the Map tab. iOS should show the Apple Maps street view of the Bay Area; Android should show the MapLibre demo style (a stylized vector basemap). Pan and zoom the map; the bottom strip's lat/lng/latDelta/lngDelta values should update each time the gesture settles. If the map renders but `onRegionChange` does not fire, walk back through Task 4.3 (Android dispatcher) or Task 3.2 (iOS event emitter); one is silently dropping events.
>
> Common failure modes if something does not look right:
>
> - **iOS Map tab shows a pink "Unimplemented component: <MapView>" screen** — `ios.componentProvider` is missing from the Step 1 `codegenConfig`. Add it, run `cd ios && bundle exec pod install && cd ..`, and rebuild.
> - **iOS build fails at link time with `Undefined symbols ... _OBJC_CLASS_$_MKMapView`** — MapKit.framework is not linked to the app target. Re-run the Step 3 "Link MapKit.framework" subsection.
> - **iOS app crashes with `EXC_BAD_ACCESS` in `-[RCTMapView updateProps:oldProps:]`** — the casts in `updateProps:` are dereferencing the `oldProps` argument, which is null on first mount. The skeleton uses `_props` to avoid this; if you edited it, restore the `_props` form in both cast lines.
> - **Android shows a gray map with no tiles** — the demo style URL did not load (network blocked, URL stale, or the app does not have INTERNET permission). Check logcat for tile fetch errors and try `https://demotiles.maplibre.org/style.json` in a browser to verify the URL.
> - **Android emulator cannot resolve any hostname** (logcat shows `Unable to resolve host "demotiles.maplibre.org"` plus similar for Google's connectivity probes) — emulator DNS is broken. Cold-boot the emulator (Android Studio → Device Manager → ⋮ → Cold Boot Now), or start it with `emulator -avd <name> -dns-server 8.8.8.8,1.1.1.1`. If your host has a VPN, disconnect; emulator networking often breaks under VPNs.
> - **Android map renders, but the camera snaps to extreme zoom and shows a uniform color** — `emitRegionChange` is reporting bad delta values that JS feeds back into `setRegion`, creating a tightening feedback loop. Make sure the deltas are derived from `cam.zoom` (`360.0 / 2^zoom`) and not from `map.projection.visibleRegion.latLngBounds`; the projection query returns degenerate bounds during early layout.
> - **Android map renders, but `onRegionChange` never fires in JS** — the codegen `topRegionChange` to `onRegionChange` mapping is the suspect; verify your TS spec file ends with `NativeComponent.ts` and `setRegion`/`emitRegionChange` are wired in Tasks 4.2 and 4.3.
> - **You changed Kotlin code but the app behaves the same** — Kotlin changes require a full Android rebuild (`npx react-native run-android`), not just a Metro JS reload. Pressing R-R in the dev menu only reloads JavaScript.

> Reference: deck slide 36, right panel.

---

## Things worth noticing

These do not need TODOs; they are the conceptual content from deck slides 36, 38, and 39 that becomes relevant once you start using your component in real apps.

**Recyclable views.** When your component renders inside a `FlatList` or `RecyclerView`, React Native may recycle the underlying native view across cells with different props. On iOS, override `prepareForRecycle` to reset state. On Android, the same hook exists via the `RecyclableView` interface. The default behavior is correct only for stateless views; map state (camera position, markers, gestures-in-progress) leaks across cells without explicit reset. The workshop's MapView is rendered as a single screen-filling instance, so this does not bite us, but in real apps where a map appears in a list cell or pager, this is the most common Fabric bug.

**Threading.** `updateProps` runs on the main thread on iOS and on the UI thread on Android. Heavy work (image decoding, geometry computation, vector parsing) inside `updateProps` blocks frame rendering. Dispatch the heavy part to a background queue, then back to the main/UI thread for the actual draw call. The MapLibre `getMapAsync` callback in your Android implementation is one example of this pattern; iOS-side, `setRegion:animated:` itself runs on a background queue inside MapKit, which is why our `updateProps` returns immediately even though the camera animation takes hundreds of milliseconds.

**Prop batching.** Fabric calls `updateProps:oldProps:` once per render with the diffed props, not once per individual prop change. If your TS spec declares ten props and JS updates five of them, you get one `updateProps` call with five differences. The diff-and-apply pattern (`if (oldProps.X != newProps.X) { ... }`) is the right shape for that; it handles any subset of props changing without extra plumbing.

**Lifecycle and recycling on Android specifically.** The `MapLifecycleBridge` already handles the host (Activity) lifecycle: when the Activity pauses, the map pauses, and so on. What it does NOT handle is view recycling: if the same `MapView` instance is reassigned to a different cell in a list, the bridge stays attached to the old context. For list-based use cases, override `onDropViewInstance` in your manager and call `bridge.detach()` plus `mapView.onStop()` and `mapView.onDestroy()`.

> Reference: deck slides 36, 38, 39.

---

## Compare with Exercise 04

Once Exercise 04 is available, switch to `04-nitro-component` and notice three things:

1. The TS spec extends `HybridView<...>` rather than using `codegenNativeComponent`. Props become typed Swift/Kotlin members on the implementation class; events become first-class callback function args (not codegen-emitted struct types).
2. The iOS implementation is pure Swift extending the Nitrogen-generated `HybridMapViewSpec`, no Objective-C++ at all. The `region` prop is a `var region: Region` with a `didSet` observer that calls `mapView.setRegion(...)` directly.
3. The Android implementation is pure Kotlin extending `HybridMapViewSpec()` directly, no `SimpleViewManager`, no `MapPackage`, no manual registration in `MainApplication.kt`. The same `MapLibreInitializer` and `MapLifecycleBridge` are reused; everything else collapses into one class.

Visually, the Map and Map (Nitro) screens will be deliberately identical in shell. Same header copy except for the framework name in the subtitle, same map area, same region strip at the bottom. Read both screens and the two view-implementation files side by side for the most concrete sense of the diff.
