# Exercise 02: Build a Math module with Nitro Modules

> Reset your working tree to the `scaffold-v1` tag (`git reset --hard scaffold-v1`) and complete the steps below in your own checkout. Each task has a collapsible **Show solution** you can expand if you get stuck. The completed reference code for this exercise lives on the `02-nitro-module` branch (the same branch this README is on); once you finish, run `git diff 02-nitro-module` to see how your final state compares.

This exercise uses the shared `Card` component at `src/components/Card.tsx` and icons from `lucide-react-native`, both included in `scaffold-v1`. If you are starting from a fresh clone and either is missing, copy the Card component from the `01-turbo-module` branch (`git show 01-turbo-module:src/components/Card.tsx > src/components/Card.tsx`) and install lucide (`npm install lucide-react-native`).

## What you will build

A `Math` HybridObject exposing `pi` (a property) and `add(a, b)` (a sync method) on both iOS and Android, packaged as a local Nitro library at `packages/nitro-math/`. By the end of the must-do steps (1 through 5), the Math (Nitro) screen reads `pi = 3.14159...` from native code and computes `add(2, 3) = 5` via a button press, on both platforms, rendered with the same Card-based UI used in Exercise 01.

The stretch steps (6 and 7) extend the module with `fetchScore(userId)` (an async method returning `Promise<number>`) and `startWork(onProgress)` (a progress callback). Skip these on a first pass if time is tight; they teach the same Nitro authoring patterns at greater verbosity. Compare your final state against the `02-nitro-module` branch and against Exercise 01's matching steps for the most useful diff.

## Why a separate library, not app-level

Unlike Exercise 01, where the Turbo Module lives directly inside the host app (`ios/NativeModulesTraining/`, `android/app/src/main/java/...`), this exercise builds a self-contained Nitro library at `packages/nitro-math/`. There are two reasons.

The first is that Nitro itself is designed for library distribution. Its tooling (Nitrogen, the autolinking generators, the prefab/podspec packaging) assumes you are publishing a module that other apps consume, not slotting code directly into a host. App-level integration with Nitro is documented as rocky territory in multiple open issues; the supported path is library-shaped.

The second is that this matches what most teams will actually do in production. Nitro shines when you wrap a vendor SDK or expose a native subsystem as a reusable package. Doing it library-first in the workshop means the patterns you learn transfer cleanly to real work.

The library will be referenced from the host app via a relative file dependency (`"nitro-math": "file:./packages/nitro-math"`), no npm publish needed.

---

## Step 1 (must-do): Set up the library skeleton

Create the directory layout and metadata files for `packages/nitro-math`. The skeleton is mostly boilerplate but every field matters for autolinking, and getting them wrong produces silent autolinking failures rather than build errors.

From the repo root:

```bash
mkdir -p packages/nitro-math/src/specs
mkdir -p packages/nitro-math/ios
mkdir -p packages/nitro-math/android/src/main/java/com/margelo/nitro/math
mkdir -p packages/nitro-math/android/src/main/cpp
```

Note the Android Java path: `com/margelo/nitro/math/`, not `com/nativemodulestraining/...`. Nitrogen requires Hybrid Object implementations to live under `com.margelo.nitro.<cxxNamespace>` regardless of your app's package. We will see why in Step 4.

### Task 1.1: Create `packages/nitro-math/package.json`

Create the file with these contents:

```json
{
  "name": "nitro-math",
  "version": "0.0.1",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "files": [
    "src",
    "ios",
    "android",
    "nitrogen",
    "NitroMath.podspec",
    "nitro.json"
  ],
  "scripts": {
    "nitrogen": "nitro-codegen"
  },
  "peerDependencies": {
    "react": "*",
    "react-native": "*",
    "react-native-nitro-modules": "*"
  },
  "devDependencies": {
    "nitro-codegen": "^0.35.6"
  }
}
```

`peerDependencies` rather than `dependencies` because the host app provides these. `react-native-nitro-modules` will be installed at the host app level in Step 5.

### Task 1.2: Create `packages/nitro-math/nitro.json`

This file configures Nitrogen. Create it with:

```json
{
  "cxxNamespace": ["math"],
  "ios": {
    "iosModuleName": "NitroMath"
  },
  "android": {
    "androidNamespace": ["math"],
    "androidCxxLibName": "NitroMath"
  },
  "autolinking": {
    "Math": {
      "ios": {
        "language": "swift",
        "implementationClassName": "HybridMath"
      },
      "android": {
        "language": "kotlin",
        "implementationClassName": "HybridMath"
      }
    }
  }
}
```

Field by field.

`cxxNamespace: ["math"]` becomes the C++ `margelo::nitro::math` namespace. It must be lowercase. Multi-segment namespaces like `["company", "math"]` are allowed but rarely useful for a single library.

`ios.iosModuleName: "NitroMath"` is the name of the iOS framework; it must match the podspec name in Task 1.3 below.

`android.androidNamespace: ["math"]` becomes the trailing segment of the Kotlin package: your Hybrid implementations will live under `com.margelo.nitro.math`. This is non-negotiable; Nitrogen-generated code expects exactly this layout.

`android.androidCxxLibName: "NitroMath"` is the name of the shared library produced by CMake; this becomes `libNitroMath.so` and is what `System.loadLibrary("NitroMath")` will load.

`autolinking.Math.{ios,android}` declares that the HybridObject named `"Math"` is implemented by class `HybridMath` (in the language specified) on each platform. Nitrogen uses this to generate the registration glue.

### Task 1.3: Create `packages/nitro-math/NitroMath.podspec`

For iOS, Nitro libraries are distributed as CocoaPods. Create the podspec:

```ruby
require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "NitroMath"
  s.version      = package["version"]
  s.summary      = package["name"]
  s.homepage     = "https://example.com/nitro-math"
  s.license      = "MIT"
  s.authors      = ""
  s.platforms    = { :ios => "13.4" }
  s.source       = { :git => "" }

  s.source_files = [
    "ios/**/*.{swift,h,m,mm}",
    "nitrogen/generated/shared/c++/**/*.{cpp,hpp}",
    "nitrogen/generated/ios/**/*.{swift,h,m,mm,cpp,hpp}",
  ]

  s.pod_target_xcconfig = {
    "DEFINES_MODULE" => "YES",
  }

  load "nitrogen/generated/ios/NitroMath+autolinking.rb"
  add_nitrogen_files(s)

  s.dependency "React-Core"
  install_modules_dependencies(s)
end
```

The `s.name` must match `nitro.json`'s `iosModuleName`. The `add_nitrogen_files(s)` call is what wires Nitrogen-generated sources into the pod; that file is created by Nitrogen in Step 2.

### Task 1.4: Add the local dependency to the host app

In the **root** `package.json` (not the library's), add the local file dependency in `dependencies`:

```json
{
  "dependencies": {
    "nitro-math": "file:./packages/nitro-math",
    "react-native-nitro-modules": "^0.35.6"
  }
}
```

Then install:

```bash
npm install
```

This creates a symlink from `node_modules/nitro-math` to `packages/nitro-math`, and pulls `react-native-nitro-modules` into `node_modules` for both the app and the library to share.

> Reference: deck slide 18, right panel.

---

## Step 2 (must-do): Write the Nitro spec

Nitro generates native bindings from a TypeScript file with a `.nitro.ts` extension. The conventions are: the file lives in your library's `src/specs/`, exports an interface that extends `HybridObject`, and is paired with a small `src/index.ts` barrel that exposes the JS-side handle.

### Task 2.1: Create `packages/nitro-math/src/specs/Math.nitro.ts`

Create the file with this skeleton:

```typescript
import type { HybridObject } from 'react-native-nitro-modules';

export interface Math extends HybridObject<{ ios: 'swift', android: 'kotlin' }> {
  // TODO 2.1
}
```

Declare two members on the `Math` interface:

- `pi`: a `readonly` number property (not a method, not inside `getConstants()`)
- `add(a, b)`: takes two numbers and returns a number

<details>
<summary><kbd>Show solution</kbd></summary>

```typescript
  readonly pi: number;
  add(a: number, b: number): number;
```

</details>

Three things worth noticing.

The interface is named `Math`, exactly as you want it surfaced to JS. There is no separate `Spec` indirection like in Turbo Modules; the type IS the public API. Renaming `Math` here renames the JS-side import in Step 5.

`HybridObject<{ ios: 'swift', android: 'kotlin' }>` is the type-level declaration that tells Nitrogen which language to generate scaffolding for on each platform. The values are restricted: iOS supports `'swift'` or `'c++'`, Android supports `'kotlin'`, `'java'`, or `'c++'`. We use Swift and Kotlin.

`readonly pi: number` is a real property, not a method. Nitro exposes this as a direct property access on the JS-side handle (`Math.pi`, no parens), which is impossible in Turbo Modules where constants must live inside `getConstants()`. This is a deliberate quality-of-life difference; Nitrogen-generated JSI code synthesizes a getter behind the scenes.

### Task 2.2: Create `packages/nitro-math/src/index.ts`

This is the public entry point of the library. Create it with:

```typescript
import { NitroModules } from 'react-native-nitro-modules';
import type { Math as MathSpec } from './specs/Math.nitro';

export const Math = NitroModules.createHybridObject<MathSpec>('Math');
```

`NitroModules.createHybridObject<T>(name)` instantiates the registered HybridObject from the C++ registry. The string `'Math'` must match the autolinking key in `nitro.json` (Task 1.2) AND the spec interface name. Three places, one string; drift here produces a runtime error of the form `"Cannot create instance of HybridObject 'Math'"`.

### Task 2.3: Run Nitrogen

From the library's directory, run Nitrogen to generate native bindings:

```bash
cd packages/nitro-math
npx nitro-codegen
cd ../..
```

Nitrogen produces files under `packages/nitro-math/nitrogen/generated/`. Inspect what was created:

```bash
ls packages/nitro-math/nitrogen/generated/
ls packages/nitro-math/nitrogen/generated/ios/swift/
ls packages/nitro-math/nitrogen/generated/android/kotlin/com/margelo/nitro/math/
```

You should see:
- `shared/c++/HybridMathSpec.{cpp,hpp}` (the cross-platform C++ base your impls eventually inherit from, transitively)
- `ios/swift/HybridMathSpec.swift` (the Swift protocol your iOS implementation will conform to)
- `ios/c++/...`, `ios/NitroMath-Swift-Cxx-Bridge.{cpp,hpp}` (Swift-to-C++ bridge code)
- `android/kotlin/com/margelo/nitro/math/HybridMathSpec.kt` (the Kotlin abstract class your Android implementation will extend)
- `android/c++/JHybridMathSpec.{cpp,hpp}` (JNI bridge code)
- `android/NitroMathOnLoad.{cpp,hpp,kt}` and `android/NitroMath+autolinking.{cmake,gradle}` (autolinking glue, more on these in Step 4)

You will not edit any of these files. Your job is to provide concrete implementations that conform to the generated specs.

> Reference: deck slide 14, right panel.

---

## Step 3 (must-do): Implement on iOS

A Nitro Module on iOS is one Swift file that conforms to the Nitrogen-generated protocol. No Objective-C++. No `.mm` files. No bridge headers. The Swift compiler handles the C++ interop transparently via the Nitrogen-generated `Cxx-Bridge`.

### Task 3.1: Create `packages/nitro-math/ios/HybridMath.swift`

Create the file with this skeleton:

```swift
import Foundation
import NitroModules

class HybridMath: HybridMathSpec {
  // TODO 3.1
  
  func add(a: Double, b: Double) -> Double {
    // TODO 3.2
    return 0
  }
}
```

Implement two things.

First, the `pi` property. Conform to the protocol by declaring a stored or computed property named `pi` of type `Double`. Use Swift's `Double.pi` standard library constant.

<details>
<summary><kbd>Show solution</kbd></summary>

Add this above `func add`:

```swift
  var pi: Double = Double.pi
```

</details>

Second, the `add` body. Return the sum of `a` and `b`.

<details>
<summary><kbd>Show solution</kbd></summary>

```swift
    return a + b
```

</details>

Three things worth noticing.

`HybridMathSpec` is a protocol generated by Nitrogen at `packages/nitro-math/nitrogen/generated/ios/swift/HybridMathSpec.swift`. It declares the same shape as your TypeScript spec, translated to Swift. Open the file to see; you will not edit it.

`var pi: Double = Double.pi` is a stored property assigned at instantiation. You could also write it as a computed property (`var pi: Double { return Double.pi }`); both satisfy the protocol. The stored form is marginally faster because the JS-side property access becomes a single field read on the C++ side.

The class name `HybridMath` must match `nitro.json`'s `autolinking.Math.ios.implementationClassName` exactly (Task 1.2). Mismatches surface as Swift compile errors of the form `"cannot find HybridMath in scope"` from the autogenerated registration code.

### Task 3.2: Run pod install

From the repo root:

```bash
cd ios && bundle exec pod install && cd ..
```

This processes the `NitroMath.podspec` you created in Task 1.3, which calls `add_nitrogen_files(s)` to wire all the generated Swift, C++, and bridge files into the pod. Verify it succeeded:

```bash
ls ios/Pods/NitroMath/
```

You should see your `HybridMath.swift` plus all the Nitrogen-generated sources. iOS is now ready; you will not see it on screen until Step 5 wires JS into the picture.

> Reference: deck slide 21, right panel.

---

## Step 4 (must-do): Implement on Android

Android is the heavy step. A Nitro Module on Android requires four pieces:

- A Kotlin class implementing the Nitrogen-generated abstract spec
- A `cpp-adapter.cpp` containing `JNI_OnLoad` (Nitrogen does NOT generate this for you; this is the most common omission and produces a registry that is silently empty)
- A `NitroMathPackage.kt` that initializes the native libraries in the correct order at app startup
- A `CMakeLists.txt` and `build.gradle` to build the shared library

Each is small individually; the trick is knowing they are all required.

### Task 4.1: Create `packages/nitro-math/android/src/main/java/com/margelo/nitro/math/HybridMath.kt`

The Kotlin equivalent of the Swift implementation:

```kotlin
package com.margelo.nitro.math

class HybridMath : HybridMathSpec() {
  // TODO 4.1
  
  override fun add(a: Double, b: Double): Double {
    // TODO 4.2
    return 0.0
  }
}
```

Implement `pi` (override it as a property assigned to `kotlin.math.PI`) and `add` (return the sum).

<details>
<summary><kbd>Show solution</kbd></summary>

```kotlin
  override val pi: Double = kotlin.math.PI

  override fun add(a: Double, b: Double): Double {
    return a + b
  }
```

</details>

Use `kotlin.math.PI` rather than `Math.PI` to avoid any ambiguity with your own `HybridMath` class name.

The Kotlin package MUST be `com.margelo.nitro.math`. Nitrogen-generated JNI code looks up your class via this exact path; placing it elsewhere produces a `ClassNotFoundException` at runtime when the C++ side tries to instantiate the Hybrid Object.

### Task 4.2: Create `packages/nitro-math/android/src/main/cpp/cpp-adapter.cpp`

This is the file Nitrogen does NOT generate but absolutely requires. Without it, `System.loadLibrary("NitroMath")` loads `libNitroMath.so` into memory but no JNI registration runs, and the `HybridObjectRegistry` stays empty. The error you see in JS is misleadingly named ("HybridObject 'Math' is not registered"); the actual problem is one missing file.

The Nitrogen-generated header `NitroMathOnLoad.hpp` is explicit about this in its docstring. Look at it:

```bash
cat packages/nitro-math/nitrogen/generated/android/NitroMathOnLoad.hpp
```

It tells you what to write. Create `packages/nitro-math/android/src/main/cpp/cpp-adapter.cpp`:

```cpp
#include <jni.h>
#include <fbjni/fbjni.h>
#include "NitroMathOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return facebook::jni::initialize(vm, []() {
    margelo::nitro::math::registerAllNatives();
  });
}
```

Three lines of substance. `JNI_OnLoad` is the standard JVM extension point: when `System.loadLibrary("NitroMath")` runs, the dynamic linker dlopens the library and the JVM looks for a `JNI_OnLoad` symbol; if present, it gets called synchronously on the loading thread. `facebook::jni::initialize` is fbjni's bootstrap, and the lambda passed to it runs `registerAllNatives()` which performs the actual registration of `HybridMath` into the `HybridObjectRegistry`.

Without a `JNI_OnLoad` to call into, `registerAllNatives()` is dead code in the binary. The library loads fine, but nothing ever asks it to register.

### Task 4.3: Create `packages/nitro-math/android/src/main/java/com/margelo/nitro/math/NitroMathPackage.kt`

This is a React Native package whose only job is to initialize the native libraries in the right order at app startup. The order matters because of how the libraries depend on each other.

Create the file:

```kotlin
package com.margelo.nitro.math

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.margelo.nitro.JNIOnLoad

class NitroMathPackage : BaseReactPackage() {
  init {
    // TODO 4.3
  }

  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? = null

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
    ReactModuleInfoProvider { mapOf() }
}
```

In the `init` block, two calls in this exact order: `JNIOnLoad.initializeNativeNitro()` first, then `NitroMathOnLoad.initializeNative()`.

<details>
<summary><kbd>Show solution</kbd></summary>

```kotlin
  init {
    JNIOnLoad.initializeNativeNitro()
    NitroMathOnLoad.initializeNative()
  }
```

</details>

The order is the entire point of this class. Here is why.

`JNIOnLoad.initializeNativeNitro()` (a static method on `com.margelo.nitro.JNIOnLoad`, in `react-native-nitro-modules`) loads `libNitroModules.so`. That library's `JNI_OnLoad` initializes the C++ `HybridObjectRegistry` singleton.

`NitroMathOnLoad.initializeNative()` (Nitrogen-generated, in your library) loads `libNitroMath.so`. That library's `JNI_OnLoad` (which you wrote in Task 4.2) calls `registerAllNatives()`, which calls `HybridObjectRegistry::registerHybridObjectConstructor("Math", ...)` to register your hybrid object.

If the order is reversed, `registerAllNatives()` runs against a registry that does not exist yet (the singleton is allocated when libNitroModules's `JNI_OnLoad` runs, not before). The registration silently lands in a different registry instance, and JS later finds an empty registry. Both methods are idempotent; calling them again is a no-op.

In Exercise 01, registration on Android happened by the host app's `MainApplication.kt` calling `MathPackage()`. In Nitro, no equivalent change to `MainApplication.kt` is needed. The package class is autolinked through React Native's autolinking, and React Native instantiates it during startup. The `init` block runs on instantiation.

### Task 4.4: Create the Android Gradle and CMake build files

You need three files: a `build.gradle` for the Android module, a `CMakeLists.txt` to compile the C++ side, and an `AndroidManifest.xml` (it can be empty besides the package declaration, but Gradle requires it to exist).

Create `packages/nitro-math/android/build.gradle`:

```gradle
buildscript {
  repositories { google(); mavenCentral() }
  dependencies {
    classpath "com.android.tools.build:gradle:8.10.2"
    classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:2.1.20"
  }
}

apply plugin: "com.android.library"
apply plugin: "kotlin-android"

def safeExtGet(prop, fallback) {
  rootProject.ext.has(prop) ? rootProject.ext.get(prop) : fallback
}

android {
  namespace "com.margelo.nitro.math"
  compileSdkVersion safeExtGet("compileSdkVersion", 35)

  defaultConfig {
    minSdkVersion safeExtGet("minSdkVersion", 24)
    targetSdkVersion safeExtGet("targetSdkVersion", 35)
    externalNativeBuild {
      cmake {
        cppFlags "-O2 -frtti -fexceptions -Wall -fstack-protector-all"
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

  compileOptions {
    sourceCompatibility JavaVersion.VERSION_17
    targetCompatibility JavaVersion.VERSION_17
  }
}

dependencies {
  implementation "com.facebook.react:react-android"
  implementation project(":react-native-nitro-modules")
}

apply from: "../nitrogen/generated/android/NitroMath+autolinking.gradle"
```

The `apply from: "../nitrogen/generated/android/NitroMath+autolinking.gradle"` line at the bottom is what wires Nitrogen-generated Kotlin and Java sources into the build. Without it, `NitroMathOnLoad.kt` (which `NitroMathPackage` imports) is not on the classpath and the Kotlin compiler fails with "unresolved reference."

Create `packages/nitro-math/android/CMakeLists.txt`:

```cmake
cmake_minimum_required(VERSION 3.22.1)

# Project name MUST match androidCxxLibName in nitro.json
project(NitroMath)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Create the library target. autolinking.cmake adds the actual nitrogen sources
# via target_sources, but add_library requires at least one source file to start.
file(WRITE "${CMAKE_BINARY_DIR}/dummy.cpp"
  "// Placeholder source for NitroMath. Real sources added by NitroMath+autolinking.cmake.\n")
add_library(NitroMath SHARED "${CMAKE_BINARY_DIR}/dummy.cpp")

# Include nitrogen's autolinking.
include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/NitroMath+autolinking.cmake)

# JNI_OnLoad. Required so System.loadLibrary("NitroMath") triggers
# registerAllNatives().
target_sources(NitroMath PRIVATE ${CMAKE_SOURCE_DIR}/src/main/cpp/cpp-adapter.cpp)
```

The dummy file is a CMake quirk: `add_library(... SHARED ...)` requires at least one source at the time of declaration, and the actual sources come from the autolinking include below. The dummy is never read by anything; it is just there to satisfy the call.

The `target_sources` line at the bottom is what compiles your `cpp-adapter.cpp` into `libNitroMath.so`. Forgetting this line is equivalent to not writing `JNI_OnLoad` at all; the file exists on disk but never makes it into the binary.

Finally, create `packages/nitro-math/android/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android" />
```

That is the entire file. Android Gradle Plugin requires the manifest to exist; nothing inside it matters for a pure-native module like ours.

> Reference: deck slide 23, right panel. The deck shows the Kotlin class but does not cover the JNI/CMake side; that material lives in the Nitrogen header docstrings, which we read directly in Task 4.2.

---

## Step 5 (must-do): Use the module from JavaScript

With the library built on both platforms, plumb it into the host app's UI and verify end-to-end. The screen will use the same `Card` component as Exercise 01 so the two screens read as visually parallel; the differences in API surface (property vs `getConstants`, no Spec indirection, etc.) are what we want students to compare.

### Task 5.1: Add the Math (Nitro) tab to your app's navigation

This depends on your scaffold's exact navigation structure. In the workshop scaffold, `App.tsx` defines a tab navigator; add a new tab pointing at a new screen:

```tsx
import { NitroMathScreen } from './src/screens/NitroMathScreen';

// inside the tab navigator:
<Tab.Screen name="Math (Nitro)" component={NitroMathScreen} />
```

### Task 5.2: Create `src/screens/NitroMathScreen.tsx`

Start with this skeleton (replace any existing placeholder content):

```tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Pi, Plus } from 'lucide-react-native';
import { Math as NitroMath } from 'nitro-math';
import { Card } from '../components/Card';

export function NitroMathScreen() {
  // TODO 5.2: read pi from NitroMath
  const pi = 0;

  const [sum, setSum] = useState<number | null>(null);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Math (Nitro)</Text>
        <Text style={styles.subtitle}>HybridObject via Nitro Modules</Text>
      </View>

      <Card icon={Pi} label="Property" kind="Math.pi">
        <Text style={styles.value}>{pi.toFixed(6)}</Text>
        <Text style={styles.caption}>Direct property access, no getter call.</Text>
      </Card>

      <Card icon={Plus} label="Sync method" kind="add(a, b)">
        <Text style={styles.value}>
          {sum === null ? 'press Run to compute' : `add(2, 3) = ${sum}`}
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          // TODO 5.3: invoke NitroMath.add(2, 3) and store the result
          onPress={() => {}}
        >
          <Text style={styles.buttonLabel}>Run</Text>
        </Pressable>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 16, gap: 12 },
  header: { paddingVertical: 12, paddingHorizontal: 4, gap: 4 },
  title: { fontSize: 28, fontWeight: '700', color: '#1C1C1E' },
  subtitle: { fontSize: 14, color: '#8E8E93' },
  value: { fontSize: 18, fontWeight: '600', color: '#1C1C1E' },
  caption: { fontSize: 13, color: '#8E8E93' },
  button: {
    backgroundColor: '#0A84FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
    alignSelf: 'flex-start',
    minWidth: 100,
  },
  buttonPressed: { backgroundColor: '#0066CC' },
  buttonDisabled: { backgroundColor: '#A0A0A5' },
  buttonLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
```

The `buttonDisabled` style is included up front because it will be used in Steps 6 and 7 (loading and working states); leaving it in saves you from editing the styles dictionary later.

### Task 5.3

Replace `const pi = 0;` to read `pi` directly from `NitroMath` (a property, not a method call), and wire the button to compute `NitroMath.add(2, 3)`.

<details>
<summary><kbd>Show solution</kbd></summary>

Replace `const pi = 0;` with:

```tsx
  const pi = NitroMath.pi;
```

And the button's `onPress`:

```tsx
        onPress={() => setSum(NitroMath.add(2, 3))}
```

</details>

`NitroMath.pi` is a direct property access. There is no function call, no `getConstants()` indirection. The JS-side handle exposes properties that map to fields on the underlying C++ HybridObject. Compare against `NativeMath.getConstants().pi` from Exercise 01 to feel the difference.

The import is `import { Math as NitroMath } from 'nitro-math'`. The aliasing avoids shadowing the global `Math` in this file, same advice as in Exercise 01.

The `Card` component's `icon`, `label`, and `kind` props are the same shape as in Exercise 01; you are reusing the same component. The visual parallelism is the whole point: when you put the Math and Math (Nitro) tabs side by side, the only meaningful difference is the API surface.

> Checkpoint after Step 5: rebuild on both platforms (`npx react-native run-ios --simulator="iPhone 16"` and `npx react-native run-android`). Navigate to the Math (Nitro) tab. The header reads "Math (Nitro)" and "HybridObject via Nitro Modules"; the Property card shows `3.141593`; pressing Run on the Sync method card populates `add(2, 3) = 5`. If iOS works but Android shows the "HybridObject 'Math' not registered" error, walk back through Task 4.2 (cpp-adapter.cpp), Task 4.3 (load order in `NitroMathPackage`), and the `target_sources` line in CMakeLists.txt; one of those is missing or wrong.

> Reference: deck slide 25, right panel.

---

## Step 6 (stretch): Async methods with Promise

Add a `fetchScore(userId)` method that returns a `Promise<number>`, plus a third Card to display its loading state and result. Same authoring difference message as Exercise 01: the simulated 1-second delay is for workshop determinism; production code uses real concurrency primitives.

### Update the spec

Edit `packages/nitro-math/src/specs/Math.nitro.ts`:

```typescript
export interface Math extends HybridObject<{ ios: 'swift', android: 'kotlin' }> {
  readonly pi: number;
  add(a: number, b: number): number;
  // TODO 6.1
}
```

### Task 6.1

Declare `fetchScore` to take a `userId` string and return a `Promise<number>`.

<details>
<summary><kbd>Show solution</kbd></summary>

```typescript
  fetchScore(userId: string): Promise<number>;
```

</details>

After the spec change, regenerate Nitrogen output:

```bash
cd packages/nitro-math
npx nitro-codegen
cd ../..
cd ios && bundle exec pod install && cd ..
```

Both your iOS and Android implementations will fail to compile until you implement the new method.

### Implement on iOS

In `packages/nitro-math/ios/HybridMath.swift`, add the method skeleton:

```swift
func fetchScore(userId: String) throws -> Promise<Double> {
  // TODO 6.2
  return Promise.async {
    return 0
  }
}
```

### Task 6.2

Implement `fetchScore`:

- If `userId.isEmpty`, throw `NSError(domain: "NitroMath", code: 1, userInfo: [NSLocalizedDescriptionKey: "userId cannot be empty"])`
- Otherwise, return a `Promise.async { ... }` that sleeps 1 second (`try await Task.sleep(nanoseconds: 1_000_000_000)`) then returns `Double.random(in: 0...100).rounded()`

<details>
<summary><kbd>Show solution</kbd></summary>

```swift
  if userId.isEmpty {
    throw NSError(domain: "NitroMath", code: 1, userInfo: [NSLocalizedDescriptionKey: "userId cannot be empty"])
  }

  return Promise.async {
    try await Task.sleep(nanoseconds: 1_000_000_000)
    return Double.random(in: 0...100).rounded()
  }
```

</details>

`Promise.async { ... }` is Nitro's bridge from Swift's structured concurrency to JS Promises. Inside the closure, you write straight Swift async/await. Throwing from inside the closure rejects the Promise; throwing synchronously (before constructing the `Promise.async`) also rejects it but skips the async work. Compare against Exercise 01's resolver/rejecter blocks: this is significantly tighter, and the type system enforces that you call exactly one path.

### Implement on Android

In `packages/nitro-math/android/src/main/java/com/margelo/nitro/math/HybridMath.kt`, add imports and the method skeleton:

```kotlin
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.delay
import kotlin.random.Random

// inside class HybridMath, after add():

override fun fetchScore(userId: String): Promise<Double> {
  // TODO 6.3
  return Promise.async {
    0.0
  }
}
```

### Task 6.3

Implement `fetchScore`:

- If `userId.isEmpty()`, throw `IllegalArgumentException("userId cannot be empty")`
- Otherwise, return `Promise.async { ... }` that calls `delay(1000)` then returns `Random.nextDouble(0.0, 100.0).toInt().toDouble()`

<details>
<summary><kbd>Show solution</kbd></summary>

```kotlin
  if (userId.isEmpty()) {
    throw IllegalArgumentException("userId cannot be empty")
  }

  return Promise.async {
    delay(1000)
    Random.nextDouble(0.0, 100.0).toInt().toDouble()
  }
```

</details>

`Promise.async { ... }` is a coroutine builder from `com.margelo.nitro.core.Promise`. `delay(1000)` is Kotlin's coroutine-friendly suspend function (not the blocking `Thread.sleep`). The whole closure runs on a background dispatcher; nothing about this calls back to the JS thread except the final result delivery.

### Add the Async method Card to the screen

Update `src/screens/NitroMathScreen.tsx` to import the `Activity` icon and `ActivityIndicator`, add async state and a handler, and render a third `Card`. The diff against Step 5's screen:

```tsx
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,  // add this
} from 'react-native';
import { Pi, Plus, Activity } from 'lucide-react-native';  // add Activity
```

### Task 6.4

Add async state, an async handler, and render a third Card. Specifically:

- `score` and `loading` state
- `handleFetchScore` async handler that sets `loading`, awaits `NitroMath.fetchScore('user-123')`, stores the result, and clears `loading` in a `finally`
- A new `Card` (`icon={Activity}`, `label="Async method"`, `kind="fetchScore(userId)"`) showing the score and a Fetch Pressable that uses an `ActivityIndicator` while loading

<details>
<summary><kbd>Show solution</kbd></summary>

State and handler (add inside the component, after the `sum` state):

```tsx
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFetchScore = async () => {
    setLoading(true);
    try {
      const result = await NitroMath.fetchScore('user-123');
      setScore(result);
    } catch (err) {
      console.error('fetchScore failed:', err);
    } finally {
      setLoading(false);
    }
  };
```

JSX (add inside the `ScrollView`, after the existing Sync method Card):

```tsx
      <Card icon={Activity} label="Async method" kind="fetchScore(userId)">
        <Text style={styles.value}>
          {loading
            ? 'loading...'
            : score === null
            ? 'press Fetch'
            : `score = ${score}`}
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleFetchScore}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonLabel}>Fetch</Text>
          )}
        </Pressable>
      </Card>
```

</details>

> Checkpoint after Step 6: rebuild on both platforms. The Math (Nitro) screen now has three Cards. Press Fetch on the Async method card; after roughly one second, a number appears. The button shows an `ActivityIndicator` while in flight, confirming the call is async and not blocking the UI thread.

> Reference: deck slide 27, right panel.

---

## Step 7 (stretch): Callbacks (replacing EventEmitter)

In Exercise 01 you added a typed `EventEmitter<number>` field, with codegen scaffolding both ends. In Nitro, the equivalent concept is just a function-typed argument. No emitter type, no subscription handle, no codegen scaffolding. The callback is invoked directly from native code as many times as the implementation chooses.

We will add a `startWork(onProgress)` method that simulates 1 second of work and calls `onProgress` 10 times with values from `0.1` to `1.0`, plus a fourth Card to display it.

### Update the spec

Edit `packages/nitro-math/src/specs/Math.nitro.ts`:

```typescript
export interface Math extends HybridObject<{ ios: 'swift', android: 'kotlin' }> {
  readonly pi: number;
  add(a: number, b: number): number;
  fetchScore(userId: string): Promise<number>;
  // TODO 7.1
}
```

### Task 7.1

Declare `startWork` to take a callback `onProgress: (progress: number) => void` and return `void`.

<details>
<summary><kbd>Show solution</kbd></summary>

```typescript
  startWork(onProgress: (progress: number) => void): void;
```

</details>

Notice what is NOT here: no `EventEmitter<T>` import, no `readonly` field, no codegen-generated subscription type. The signature is just a function. Run nitrogen and pod install again:

```bash
cd packages/nitro-math && npx nitro-codegen && cd ../..
cd ios && bundle exec pod install && cd ..
```

### Implement on iOS

In `packages/nitro-math/ios/HybridMath.swift`, add the method skeleton:

```swift
func startWork(onProgress: @escaping (Double) -> Void) throws {
  // TODO 7.2
}
```

### Task 7.2

Implement `startWork`:

- Dispatch the work to a background `Task` so the calling JS thread is not blocked
- Loop 10 times: each iteration sleep 100ms (`try await Task.sleep(nanoseconds: 100_000_000)`), then call `onProgress(Double(i + 1) / 10.0)`

<details>
<summary><kbd>Show solution</kbd></summary>

```swift
  Task {
    for i in 0..<10 {
      try await Task.sleep(nanoseconds: 100_000_000)
      onProgress(Double(i + 1) / 10.0)
    }
  }
```

</details>

The `Task { ... }` wrapper is essential. Without it, the `for` loop would block the calling thread (which is the JS thread for synchronous-by-default Nitro methods). The deck slide 22 covers this in detail.

`onProgress` is just a regular Swift closure. Calling it invokes the JS-side function passed in, marshalled through Nitro's bridge automatically. No event emitter, no subscription, no removal.

### Implement on Android

In `packages/nitro-math/android/src/main/java/com/margelo/nitro/math/HybridMath.kt`, add imports and method:

```kotlin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

// inside class HybridMath, after fetchScore():

override fun startWork(onProgress: (progress: Double) -> Unit) {
  // TODO 7.3
}
```

### Task 7.3

Implement `startWork`:

- Launch a coroutine on `Dispatchers.Default`
- Loop 10 times: each iteration `delay(100)` then call `onProgress((i + 1) / 10.0)`

<details>
<summary><kbd>Show solution</kbd></summary>

```kotlin
  CoroutineScope(Dispatchers.Default).launch {
    for (i in 0 until 10) {
      delay(100)
      onProgress((i + 1) / 10.0)
    }
  }
```

</details>

Same reason as iOS for dispatching off the calling thread: Nitro methods run on the JS thread by default, and a 1-second blocking loop there would freeze the UI.

The lambda parameter is `(progress: Double) -> Unit`, which is what Nitrogen generated for the callback type. Calling it invokes the JS-side function.

### Add the Callback Card to the screen

Update `src/screens/NitroMathScreen.tsx` to import the `Hourglass` icon, add progress state and a handler, and render a fourth `Card`.

```tsx
import { Pi, Plus, Activity, Hourglass } from 'lucide-react-native';  // add Hourglass
```

### Task 7.4

Add the new state, handler, and Card:

- `progress` state of type `number | null` and `working` state of type `boolean`
- A `handleStartWork` handler that sets `working` and `progress` to initial values, then calls `NitroMath.startWork((p) => { setProgress(p); if (p >= 1) setWorking(false); })`
- A new `Card` (`icon={Hourglass}`, `label="Callback"`, `kind="startWork(onProgress)"`) showing the progress as a percentage and a Start Pressable that disables and shows an `ActivityIndicator` while working

<details>
<summary><kbd>Show solution</kbd></summary>

State and handler:

```tsx
  const [progress, setProgress] = useState<number | null>(null);
  const [working, setWorking] = useState(false);

  const handleStartWork = () => {
    setWorking(true);
    setProgress(0);
    NitroMath.startWork((p) => {
      setProgress(p);
      if (p >= 1) {
        setWorking(false);
      }
    });
  };
```

JSX (add inside the `ScrollView`, after the Async method Card):

```tsx
      <Card icon={Hourglass} label="Callback" kind="startWork(onProgress)">
        <Text style={styles.value}>
          {progress === null
            ? 'press Start'
            : `progress = ${(progress * 100).toFixed(0)}%`}
        </Text>
        <Text style={styles.caption}>Progress callback, no EventEmitter needed.</Text>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            working && styles.buttonDisabled,
          ]}
          onPress={handleStartWork}
          disabled={working}
        >
          {working ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonLabel}>Start</Text>
          )}
        </Pressable>
      </Card>
```

</details>

The callback `(p) => setProgress(p)` is invoked 10 times by the native side, once per progress tick. Each invocation queues a React state update, and the screen re-renders to show the percentage climbing from 10% to 100%.

Compare this against Exercise 01's `useEffect` + subscription + cleanup pattern. The Nitro version has no subscription object to manage and no cleanup to remember. The flip side is that the callback is bound to a single call: if you wanted to receive progress events from somewhere else later, you would need a separate `startWork` call. The EventEmitter pattern is better when you have many subscribers; the callback pattern is better when you have one caller and one consumer.

> Final checkpoint: rebuild on both platforms. The Math (Nitro) screen now has four Cards: pi, add, fetch with loading state, and startWork with progress climbing 0% to 100%. Compare your final state against the `02-nitro-module` branch for any drift, and put your Math and Math (Nitro) tabs side by side to feel how identical the UI shells are while the API surfaces differ.

> Reference: deck slide 29, right panel.

---

## Compare with Exercise 01

When you finish this exercise, switch to `01-turbo-module` and notice three things:

1. The TS spec extends `TurboModule` instead of `HybridObject<{ ios: 'swift', android: 'kotlin' }>`, and `pi` lives inside `getConstants()` rather than as a bare `readonly pi: number`.
2. The iOS implementation is Objective-C++ (`.mm` file with C++ interop) rather than pure Swift, and async methods use explicit `RCTPromiseResolveBlock`/`RCTPromiseRejectBlock` parameters rather than `Promise.async { try await ... }`.
3. The Android implementation lives directly in the host app at `com.nativemodulestraining.math`, does not need a `cpp-adapter.cpp` (Turbo's JNI is auto-wired by codegen), and registration happens via `MathPackage()` added to `MainApplication.kt`'s `getPackages()`.

Those three differences reflect the architectural choices Nitro made: pure Swift, no codegen scaffolding for events, and library-shaped distribution. The cost is the JNI legwork on Android that you saw in Step 4. The benefit is the cleaner authoring experience everywhere else, and properties as first-class citizens.

Visually, the Math and Math (Nitro) screens are deliberately identical in shell. Each Card on one tab corresponds to a Card on the other; the icon and `kind` text changes are the lesson. Read both `MathScreen.tsx` and `NitroMathScreen.tsx` side by side for the most concrete sense of the diff.

The view-level diff (Exercises 03 and 04) is similar in spirit but applied to native UI instead of native logic.
