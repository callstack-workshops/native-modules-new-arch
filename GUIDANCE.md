# Working with Native Modules: Turbo and Nitro

A walkthrough for the four exercises. Switch branches as instructed and follow the steps for the active exercise.

## Background

Brief explanation of why React Native needs native modules, what the New Architecture is, what Turbo Modules / Fabric and Nitro each are, and how their mental models differ. Two paragraphs, plus a one-line "when to pick which" summary that mirrors slide 45 of the deck.

## Workshop structure

How the four exercises map to the deck's two sections (modules in section 3, views in section 4) and to the two frameworks. Branch list. The must-do vs stretch convention used in module exercises. The solution-tag escape hatch.

## Before you begin

Pointer to the README's prerequisites and setup section. Reminder to run Metro in its own terminal. Reminder that switching exercise branches typically requires a clean rebuild on the platform you are running, with a one-line link to the README troubleshooting section. No need to repeat the commands here.

## Exercise 01: Build a Math module with Turbo Modules

> Branch: `01-turbo-module`. Switch to it before starting.

### What you will build

A `Math` native module exposing `pi: number`, `add(a, b): number`, and (in the stretch steps) `fetchScore(userId): Promise<number>` and an `onValueChanged` event. By the end of Step 5 the app reads `pi` and computes `add(2, 3) = 5` from native code on both platforms.

### Step 1 (must-do): Write the TypeScript spec

What a Turbo Module spec is, the `Native*` filename convention, why the spec is the single source of truth, and what `getConstants()` exists for instead of bare `readonly` properties. Reference: deck slide 14.

### Step 2 (must-do): Configure codegen

How `codegenConfig` in `package.json` tells codegen where to find specs, what the `name`, `type`, `jsSrcsDir` fields do, and what gets generated where on each platform. The "Native prefix" rule. Reference: deck slide 16.

### Step 3 (must-do): Implement the module on iOS

The `RCTNativeMath.h` plus `RCTNativeMath.mm` Obj-C++ pair, what `RCT_EXPORT_MODULE` does, how `getTurboModule:` returns the codegen-generated `NativeMathSpecJSI`. Reference: deck slide 21 (right panel).

### Step 4 (must-do): Implement the module on Android

The `NativeMathModule.kt` Kotlin class extending the codegen-generated `NativeMathSpec`. The package registration in `MainApplication.kt`. Reference: deck slide 23 (right panel).

### Step 5 (must-do): Use the module from JavaScript

Importing the spec, calling `add` and reading `pi` from `MathScreen.tsx`. The "everything until here is the bare minimum module" checkpoint.

> Checkpoint after Step 5: `MathScreen` displays `pi = 3.14159...` and a button that calls `add(2, 3)` and shows `5`. Both platforms.

### Step 6 (stretch): Async methods with Promise resolvers

Adding `fetchScore(userId): Promise<number>` to the spec. The Obj-C++ resolver/rejecter pattern, the explicit `RCTPromiseResolveBlock` and `RCTPromiseRejectBlock`. Forgetting either one hangs the Promise. The Kotlin equivalent using `Promise` from `com.facebook.react.bridge`. Reference: deck slide 27 (right panel). Why this is a stretch step: it adds significant native code for the same conceptual lesson and can be skipped without breaking earlier work.

### Step 7 (stretch): Events with EventEmitter

Declaring a typed `EventEmitter<number>` in the spec, calling `emitOnValueChanged` from inside `add`, subscribing to it from JS. Reference: deck slide 29 (right panel).

> Final checkpoint: `MathScreen` shows `pi`, has buttons for `add` and `fetchScore`, and live-updates a counter as `onValueChanged` events arrive.

## Exercise 02: Build the same Math module with Nitro

> Branch: `02-nitro-module`.

### What you will build

The same `Math` interface, but as a Nitro Hybrid Object. The user-facing JS surface is identical to Exercise 01. The diff is entirely in how the native side is authored.

### Step 1 (must-do): Write the .nitro.ts spec

The `HybridObject<{ ios: 'swift', android: 'kotlin' }>` extension. Why Nitro can declare `readonly pi: number` directly on the interface rather than through `getConstants()`. The `.nitro.ts` filename convention. Reference: deck slide 14 (left panel).

### Step 2 (must-do): Configure nitro.json and run nitrogen

What `nitro.json` declares, the `autolinking` map, what `nitrogen` generates and why those generated files are committed (unlike codegen, which regenerates per app build). Running `npx nitro-codegen` once, eyeballing the output. Reference: deck slide 18 and slide 43.

### Step 3 (must-do): Implement on iOS in Swift

`HybridMath.swift` extending the nitrogen-generated `HybridMathSpec`. Why no Obj-C++ shim is needed. Registering the class in the autolinking block, returning a `HybridMath` instance. Reference: deck slide 21 (left panel).

### Step 4 (must-do): Implement on Android in Kotlin

`HybridMath.kt` extending the nitrogen-generated `HybridMathSpec()`. The JNI layer that nitrogen handles for you. Calling `initializeNative()` from your `Package` class. Reference: deck slide 23 (left panel).

### Step 5 (must-do): Use the module from JavaScript

`NitroModules.createHybridObject<Math>('Math')` in `MathScreen.tsx`. The fact that Nitro returns a class instance, not a singleton, and what that means for multi-instance use cases.

> Checkpoint after Step 5: same external behaviour as Exercise 01 Step 5. Compare your spec, your iOS file, and your Android file against Exercise 01's equivalents. The diff is the lesson.

### Step 6 (stretch): Async methods with throws -> Promise<T>

`func fetchScore(userId: String) throws -> Promise<Int>` in Swift, using `Promise.async { try await ... }` with `Task.sleep`. The Kotlin equivalent using `Promise.async { delay(...) }` from coroutines. Compare with Exercise 01 Step 6's resolver/rejecter blocks. Reference: deck slide 27 (left panel).

### Step 7 (stretch): First-class JS callbacks

Declaring `startWork(onProgress: (progress: number) => void): void` in the spec. Why Nitro accepts JS functions as native arguments without an event abstraction. Calling the callback from inside a coroutine. Reference: deck slide 29 (left panel).

> Final checkpoint: same UI behaviour as Exercise 01's final checkpoint. Compare both branches side-by-side to internalise where Turbo and Nitro converge and where they diverge.

## Exercise 03: Build a MapView component with Fabric

> Branch: `03-turbo-component`. This exercise introduces a new Android dependency, MapLibre Native, on this branch only.

### What you will build

A `<MapView region={...} onRegionChange={...} />` component. iOS wraps `MKMapView` from MapKit. Android wraps MapLibre's `MapView`. Both expose `region` as a typed prop and emit `onRegionChange` when the user pans the map.

### Step 1 (must-do): Add MapLibre to the Android Gradle build

Adding `org.maplibre.gl:android-sdk:11.11.0` to `android/app/build.gradle`. Why we are using MapLibre instead of Google Maps: no API key, no billing, real third-party native SDK. iOS needs nothing extra because MapKit is built in.

### Step 2 (must-do): Write the Fabric component spec

The `MapViewNativeComponent.ts` filename convention. Declaring the `region` prop type and the `onRegionChange` event. Reference: implicit in deck slides 35, 37 (right panels).

### Step 3 (must-do): Implement the iOS view

`RCTMapView.h` and `RCTMapView.mm` extending `RCTViewComponentView`. The `componentDescriptorProvider` boilerplate. The `updateProps:oldProps:` pattern for receiving prop updates. Wiring `onRegionChange` to the `MKMapView` delegate. Reference: deck slide 35 (right panel).

### Step 4 (must-do): Implement the Android view

`MapViewManager.kt` extending `SimpleViewManager<MapView>` plus the codegen-generated `MapViewManagerInterface`. The lifecycle forwarding helper that 00-guidance ships (`MapLifecycleBridge.kt`); explanation of what it does and why students do not need to write it. Wiring `onRegionChange` to MapLibre's camera-change listener. Reference: deck slide 37 (right panel).

### Step 5 (must-do): Use the component from JavaScript

Rendering `<MapView region={...} onRegionChange={...}>` in `MapScreen.tsx`. State-driven region updates. Logging `onRegionChange` events.

> Checkpoint: a working map renders on both platforms, panning emits events, parent state can drive the visible region.

## Exercise 04: Build the same MapView with Nitro HybridView

> Branch: `04-nitro-component`.

### What you will build

The same JS-facing `<MapView>` API, implemented as a Nitro HybridView.

### Step 1 (must-do): Update nitro.json and write the .nitro.ts view spec

The `HybridView<Props, Methods>` extension. The autolinking entry that ties the spec to the Swift and Kotlin classes. Running nitrogen.

### Step 2 (must-do): Implement HybridMapView in Swift

Extending nitrogen-generated `HybridMapViewSpec`. The `view: UIView` accessor (the required handle to the underlying native view). Each prop as a stored `var` with `didSet` that pushes into `MKMapView`. Event props as nullable function fields. Reference: deck slide 35 (left panel).

### Step 3 (must-do): Implement HybridMapView in Kotlin

Extending nitrogen-generated `HybridMapViewSpec()`. `override val view: View = mapView`. Prop overrides with custom setters that drive MapLibre. Same `MapLifecycleBridge` helper as Exercise 03. Reference: corrected version of deck slide 37 (left panel) per the slide-bug discussion.

### Step 4 (must-do): Use the component from JavaScript

`getHostComponent` to obtain the view, `callback()` wrapper for event props. The pattern that differs from a plain Fabric component on the JS side.

> Checkpoint: same map UI as Exercise 03, implemented through the Nitro authoring path. Side-by-side comparison with Exercise 03 illustrates the framework diff.

## Appendix A: Real HTTP fetchScore

The simulated `Task.sleep` and `delay` versions in Steps 6 of Exercises 01 and 02 are stand-ins for any async work. This appendix shows the same `fetchScore` rewritten with `URLSession` (Swift), `HttpURLConnection` plus `Dispatchers.IO` (Kotlin), and equivalent JSON parsing on each platform. Use these in production; the simulated versions in the exercises are workshop-room friendly.

## Appendix B: Pin reasons and the maintenance contract

Reference to `MAINTENANCE.md` for the trainer-facing list of pinned dependencies and the conditions under which each pin can be removed.

## Resources

Same list as the README.
