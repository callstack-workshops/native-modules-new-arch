# Exercise 01: Build a Math module with Turbo Modules

> Reset your working tree to the `scaffold-v1` tag (`git reset --hard scaffold-v1`) and complete the steps below in your own checkout. Each task has a collapsible **Show solution** you can expand if you get stuck. The completed reference code for this exercise lives on the `01-turbo-module` branch (the same branch this README is on); once you finish, run `git diff 01-turbo-module` to see how your final state compares.

This exercise uses the shared `Card` component at `src/components/Card.tsx` and icons from `lucide-react-native`, both included in `scaffold-v1`. If you are starting from a fresh clone and either is missing, copy the Card component from the `02-nitro-module` branch (`git show 02-nitro-module:src/components/Card.tsx > src/components/Card.tsx`) and install lucide (`npm install lucide-react-native`).

## What you will build

A `Math` Turbo Module exposing `pi` (a constant) and `add(a, b)` (a sync method) on both iOS and Android. By the end of the must-do steps (1 through 5), the Math screen reads `pi = 3.14159...` from native code and computes `add(2, 3) = 5` via a button press, on both platforms, rendered with a polished Card-based UI.

The stretch steps (6 and 7) extend the module with `fetchScore(userId)` (an async method returning `Promise<number>`) and `onValueChanged` (a typed event emitted from native code that JS subscribes to). Skip these on a first pass if time is tight; they teach the same concepts at greater verbosity. Compare your final state against the `01-turbo-module` branch and against Exercise 02's matching steps for the most useful diff.

---

## Step 1 (must-do): Write the TypeScript spec

Codegen generates the native bindings from a TypeScript file. The conventions are: the file lives in your `jsSrcsDir` (we configured ours as `src/specs`), the filename is prefixed with `Native`, and it exports a TurboModule spec.

Create `src/specs/NativeMath.ts` with this skeleton:

```typescript
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  // TODO 1.1
}

export default TurboModuleRegistry.getEnforcing<Spec>('Math');
```

### Task 1.1

Declare two methods on the `Spec` interface:

- `getConstants` returns an object with a numeric `pi` property
- `add(a, b)` takes two numbers and returns a number

<details>
<summary><kbd>Show solution</kbd></summary>

```typescript
  getConstants(): { pi: number };
  add(a: number, b: number): number;
```

</details>

Three things worth noticing before you move on.

The interface is named `Spec` by convention, not `Math`. The string `'Math'` passed to `getEnforcing` is what binds this spec to a native class registered under the same name. The string and the native registration name must match exactly. Typos here produce silent runtime failures rather than compile errors.

Constants do not get to be plain `readonly` properties on a Turbo Module spec. They live inside `getConstants()`, which is a quirk of how Turbo's codegen generates the C++/JNI bindings. Nitro is more permissive on this front; you will see the difference firsthand in Exercise 02.

`getEnforcing` throws at runtime if the native module is not registered. That is exactly what you want during development. The non-enforcing variant `TurboModuleRegistry.get<Spec>('Math')` returns `null` silently, which makes diagnosis harder.

> Reference: deck slide 14, right panel.

---

## Step 2 (must-do): Configure codegen

Codegen needs to know where to look for specs and what to call the generated artifacts. Open `package.json` and add a `codegenConfig` section at the top level (sibling of `dependencies`, `scripts`, etc.):

```json
{
  "name": "NativeModulesTraining",
  ...
  "codegenConfig": {
    "name": "RCTNativeMathSpec",
    "type": "modules",
    "jsSrcsDir": "src/specs",
    "android": {
      "javaPackageName": "com.nativemodulestraining.math"
    }
  }
}
```

Field by field.

`name` is the prefix for generated files: it becomes `RCTNativeMathSpec.h`, `RCTNativeMathSpecJSI.h`, etc. on iOS, and the corresponding interface in Java/Kotlin on Android. The `RCT` prefix is React Native convention; the `Spec` suffix is required.

`type: "modules"` tells codegen to look only for module specs in this directory. Other valid values are `components` (for Fabric components, used in Exercise 03) and `all` (both, for libraries that ship modules and components together).

`jsSrcsDir` is where codegen scans for `Native*.ts` files. We use `src/specs` to match where you placed `NativeMath.ts` in Step 1. Change one and you must change the other.

`android.javaPackageName` is the Java/Kotlin package the generated Android spec interface lives in. Match this to the package you will use for `NativeMathModule.kt` in Step 4. Mismatches here produce import errors that look unrelated to the package name itself.

Now run codegen to generate the native bindings against your spec. iOS codegen runs as part of `pod install`; Android codegen runs as part of the next gradle build, so you only need to invoke pods explicitly:

```bash
cd ios && bundle exec pod install && cd ..
```

Verify the generated header exists before moving on, because Step 3 imports it:

```bash
ls ios/build/generated/ios/ReactCodegen/RCTNativeMathSpec/
```

You should see `RCTNativeMathSpec.h`, `RCTNativeMathSpec-generated.mm`, and `RCTNativeMathSpecJSI.h` listed. If the directory does not exist, your `codegenConfig.name` does not match what you set above, or `pod install` errored silently; scroll back through the pod install output before continuing.

The Android generated output appears under `android/app/build/generated/source/codegen/` after the next gradle build (which happens when you run the app). You will not edit any generated files; you will implement against the interfaces they declare in Steps 3 and 4.

> Reference: deck slide 16, right panel.

---

## Step 3 (must-do): Implement the module on iOS

A Turbo Module on iOS is two files: a header that declares the class as conforming to the codegen-generated protocol, and an Objective-C++ (`.mm`) implementation. The `.mm` extension is required because Turbo Modules call into C++ for the JSI binding.

Both files go in `ios/NativeModulesTraining/`, alongside `AppDelegate.swift`.

Create `ios/NativeModulesTraining/RCTNativeMath.h`:

```objc
#import <RCTNativeMathSpec/RCTNativeMathSpec.h>

@interface RCTNativeMath : NativeMathSpecBase <NativeMathSpec>
@end
```

The protocol `NativeMathSpec` is generated by codegen from your TS spec. The header lives at `<RCTNativeMathSpec/RCTNativeMathSpec.h>` because the `name` field in your `codegenConfig` was `RCTNativeMathSpec`. Mismatches between those two strings produce header-not-found errors.

We inherit from `NativeMathSpecBase` (the codegen-generated base class) rather than `NSObject` so that Step 7's typed event emitter has somewhere to live. For a sync-only module that never emits events, plain `NSObject` would also work; we choose the base class up front to avoid editing this file again later.

Create `ios/NativeModulesTraining/RCTNativeMath.mm` with this skeleton:

```objc
#import "RCTNativeMath.h"

using namespace facebook::react;

@implementation RCTNativeMath

RCT_EXPORT_MODULE(Math)

- (NSDictionary *)getConstants {
  // TODO 3.1
  return @{};
}

- (NSNumber *)add:(double)a b:(double)b {
  // TODO 3.2
  return @0;
}

- (std::shared_ptr<TurboModule>)
    getTurboModule:(const ObjCTurboModule::InitParams &)params {
  return std::make_shared<NativeMathSpecJSI>(params);
}

@end
```

### Task 3.1

Replace the `getConstants` body to return a dictionary with `pi` mapped to `M_PI`. `M_PI` is defined in `<math.h>`, transitively imported via your spec header.

<details>
<summary><kbd>Show solution</kbd></summary>

```objc
  return @{@"pi": @(M_PI)};
```

</details>

### Task 3.2

Replace the `add` body to return the sum of `a` and `b` wrapped as an `NSNumber *`.

<details>
<summary><kbd>Show solution</kbd></summary>

```objc
  return @(a + b);
```

</details>

Three things worth noticing.

`RCT_EXPORT_MODULE(Math)` registers this class under the name `"Math"`. That string must match the one you passed to `getEnforcing<Spec>('Math')` in Step 1. If they drift, the JS side gets `null` from the registry and your method calls throw at runtime with an unhelpful error.

`getTurboModule:` is what makes this a Turbo Module rather than a legacy Native Module. It returns a shared pointer to a JSI binding (`NativeMathSpecJSI`) that codegen generated from your TS spec. You will not edit `NativeMathSpecJSI` directly; it lives in `ios/build/generated/ios/`, regenerated on every `pod install`.

The method signatures (`add:b:`, `getConstants`) follow Objective-C naming: the parameter labels become part of the selector. Codegen knows to map TypeScript's `add(a, b)` to Obj-C's `add:b:`, but if you ever rename a method in the spec, you must update both the protocol header import and the implementation here.

Adding the files to Xcode: open `ios/NativeModulesTraining.xcworkspace`, drag both files from Finder into the `NativeModulesTraining` group in the Project Navigator.

When the "Add Files to Project" dialog appears, set "Action" to **Reference files in place** (not "Copy files to destination"; that creates duplicate files at the `ios/` root that compile alongside your real ones and produce phantom "method not found" errors). Make sure the `NativeModulesTraining` target is checked.

Xcode also prompts to create a Swift bridging header because the project contains `AppDelegate.swift`. Click **Don't Create**; nothing in our Swift code calls into this Turbo Module directly.

After adding the files, run this pre-flight check from the repo root:

```bash
find ios -name "RCTNativeMath.*" -not -path "*/build/*"
```

You should see exactly two paths, both inside `ios/NativeModulesTraining/`. If you see four (with strays under `ios/` itself), you accidentally chose "Copy files to destination". Delete the strays from disk, remove their references from Xcode (right-click in the navigator, "Delete", choose "Remove References"), and re-add the originals choosing "Reference files in place".

If you skip the Xcode add step entirely, your files will not compile and the module registration will silently never happen.

> Reference: deck slide 21, right panel.

---

## Step 4 (must-do): Implement the module on Android

A Turbo Module on Android is three pieces: a Kotlin class implementing the codegen-generated spec, a `ReactPackage` class that exposes it to React Native, and one line added to `MainApplication.kt` to register the package.

Create `android/app/src/main/java/com/nativemodulestraining/math/NativeMathModule.kt` with this skeleton:

```kotlin
package com.nativemodulestraining.math

import com.facebook.react.bridge.ReactApplicationContext

class NativeMathModule(reactContext: ReactApplicationContext) :
    NativeMathSpec(reactContext) {

  override fun getName(): String = NAME

  override fun add(a: Double, b: Double): Double {
    // TODO 4.1
    return 0.0
  }

  override fun getTypedExportedConstants(): Map<String, Any> {
    // TODO 4.2
    return mapOf()
  }

  companion object {
    const val NAME = "Math"
  }
}
```

### Task 4.1

Replace the `add` body to return the sum of `a` and `b`.

<details>
<summary><kbd>Show solution</kbd></summary>

```kotlin
    return a + b
```

</details>

### Task 4.2

Replace the `getTypedExportedConstants` body to return a Map with `pi` mapped to `Math.PI` (Kotlin's standard library constant).

<details>
<summary><kbd>Show solution</kbd></summary>

```kotlin
    return mapOf("pi" to Math.PI)
```

</details>

`NativeMathSpec` is the abstract class generated by codegen, in the package you set as `android.javaPackageName` in Step 2 (`com.nativemodulestraining.math`). Your concrete class must extend it, override every abstract method, and provide a constant `NAME` that matches the registration string used by both the JS spec and the package class below.

Note the constants override is named `getTypedExportedConstants()` on RN 0.85, not the older `getConstants()` shown in some references. The older method exists as a `final` delegating method on the generated spec; attempting to override it directly produces `'getConstants' in 'NativeMathSpec' is final and cannot be overridden`. The deck slide 23 currently shows the old name and is being corrected.

`Math.PI` here refers to `kotlin.math.PI` (or `java.lang.Math.PI`), not your Math module. The compiler resolves it correctly because you have not imported any other `Math`.

Create `android/app/src/main/java/com/nativemodulestraining/math/MathPackage.kt`:

```kotlin
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
```

`BaseReactPackage` is the modern parent class (replaces `TurboReactPackage`, which still works but is being phased out). Two methods to implement: `getModule` returns instances by name, and `getReactModuleInfoProvider` returns metadata that React Native uses to lazy-instantiate modules. The booleans on `ReactModuleInfo` are positional and easy to get wrong; the comments in the snippet tell you what each one means.

Finally, register the package in `android/app/src/main/java/com/nativemodulestraining/MainApplication.kt`. Find the `getPackages()` method and add your `MathPackage()`:

```kotlin
override fun getPackages(): List<ReactPackage> =
    PackageList(this).packages.apply {
      add(MathPackage())
    }
```

The `PackageList(this).packages` call returns the autolinked packages from your installed npm dependencies. Adding `MathPackage()` after that gives you everything autolinked plus your local module. Add the matching import at the top of the file:

```kotlin
import com.nativemodulestraining.math.MathPackage
```

Without that registration line, your module compiles fine but never appears in the Turbo Module registry, and JS calls return `null`. This is the single most common Android-side bug when adding a new module.

> Reference: deck slide 23, right panel.

---

## Step 5 (must-do): Use the module from JavaScript

With the module compiled and registered on both platforms, render it through the same Card-based UI used in Exercise 02. The screen will use the shared `Card` component from `src/components/Card.tsx` and icons from `lucide-react-native`.

Edit `src/screens/MathScreen.tsx` and replace the placeholder content with this skeleton:

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
import NativeMath from '../specs/NativeMath';
import { Card } from '../components/Card';

export function MathScreen() {
  // TODO 5.1: read pi from NativeMath
  const pi = 0;

  const [sum, setSum] = useState<number | null>(null);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Math</Text>
        <Text style={styles.subtitle}>Turbo Module on the New Architecture</Text>
      </View>

      <Card icon={Pi} label="Constant" kind="getConstants()">
        <Text style={styles.value}>{pi.toFixed(6)}</Text>
        <Text style={styles.caption}>Read once when the module loads.</Text>
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
          // TODO 5.2: invoke NativeMath.add(2, 3) and store the result
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

The `buttonDisabled` style is included up front because it will be used in Steps 6 and 7 (loading and event-receiving states); leaving it in saves you from editing the styles dictionary later.

### Task 5.1

Replace `const pi = 0;` to read `pi` from `NativeMath.getConstants()` instead.

<details>
<summary><kbd>Show solution</kbd></summary>

```tsx
  const { pi } = NativeMath.getConstants();
```

</details>

### Task 5.2

Wire the button's `onPress` to invoke `NativeMath.add(2, 3)` and store the result in state.

<details>
<summary><kbd>Show solution</kbd></summary>

```tsx
        onPress={() => setSum(NativeMath.add(2, 3))}
```

</details>

The import is named `NativeMath` rather than `Math` because importing as `Math` shadows the global `Math` constructor in this file. The deck slides use `Math` for brevity; we recommend non-shadowing names in real code.

`NativeMath.getConstants()` returns the dictionary your iOS and Android implementations declared. `NativeMath.add(2, 3)` invokes the native method through JSI synchronously and returns `5`. Both calls round-trip through your native code.

The `Card` component's `icon`, `label`, and `kind` props are the same shape used in Exercise 02; you are sharing the same component. The visual parallelism is the whole point: when you put the Math and Math (Nitro) tabs side by side later, the only meaningful differences are the API surface details (`getConstants()` vs property access, etc.).

> Checkpoint after Step 5: rebuild the app on both platforms (`npx react-native run-ios --simulator="iPhone 16"` and `npx react-native run-android`). The Math screen should display the header "Math" / "Turbo Module on the New Architecture", the Constant card showing `3.141593`, and pressing Run on the Sync method card populates `add(2, 3) = 5`. If the screen shows `pi = 0` or the button does nothing, the most likely cause is that the native side is not registered: check `RCT_EXPORT_MODULE(Math)` on iOS and the `MathPackage()` entry in `MainApplication.kt` on Android.

> Reference: deck slide 25, right panel.

---

## Step 6 (stretch): Async methods with Promise resolvers

Add a `fetchScore(userId)` method that returns a `Promise<number>`, plus a third Card to display its loading state and result. The point of this step is the authoring difference, not the network call itself; we simulate the work with a one-second delay rather than a real HTTP request, to keep the workshop deterministic and offline-friendly.

### Update the TS spec

Edit `src/specs/NativeMath.ts` and add a third method to the `Spec` interface:

```typescript
export interface Spec extends TurboModule {
  getConstants(): { pi: number };
  add(a: number, b: number): number;
  // TODO 6.1
}
```

### Task 6.1

Declare `fetchScore` to take a `userId` string argument and return a `Promise<number>`.

<details>
<summary><kbd>Show solution</kbd></summary>

```typescript
  fetchScore(userId: string): Promise<number>;
```

</details>

After this change, regenerate the native bindings by running `cd ios && bundle exec pod install && cd ..`. The Android codegen reruns automatically on the next gradle build. After the iOS regen, you can confirm the new method appears in `ios/build/generated/ios/ReactCodegen/RCTNativeMathSpec/RCTNativeMathSpec.h`. Both your iOS and Android implementations will fail to compile until you implement the new method, which is the next thing you do.

### Implement on iOS

The codegen-generated method signature is `void`-returning with explicit resolver and rejecter blocks; this is how Turbo Modules surface JS Promises to the native side.

Add this method skeleton to `ios/NativeModulesTraining/RCTNativeMath.mm`:

```objc
- (void)fetchScore:(NSString *)userId
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject {
  // TODO 6.2
}
```

### Task 6.2

Implement `fetchScore`:

- If `userId.length == 0`, reject with code `"empty_user_id"` and message `"userId cannot be empty"`.
- Otherwise, simulate a 1-second delay using `dispatch_after`, then resolve with a random integer in `[0, 100]` (use `arc4random_uniform(101)`).

<details>
<summary><kbd>Show solution</kbd></summary>

```objc
  if (userId.length == 0) {
    reject(@"empty_user_id", @"userId cannot be empty", nil);
    return;
  }

  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(1.0 * NSEC_PER_SEC)),
                 dispatch_get_global_queue(QOS_CLASS_DEFAULT, 0), ^{
    NSInteger score = arc4random_uniform(101);
    resolve(@(score));
  });
```

</details>

The resolver and rejecter blocks come from React Native's bridge headers (`RCTBridgeModule.h`, transitively imported via your spec header). They are mutually exclusive: call exactly one, exactly once. If you forget to call either, the JS Promise hangs forever with no error. If you call both, the second call is a no-op but might log a warning. The non-error rejection arguments are `code`, `message`, and an optional `NSError`; pass `nil` for the latter when the error did not originate from a Cocoa API.

`dispatch_after` simulates a 1-second async delay, dispatched to the global concurrent queue so the resolver is not blocking the calling thread. `arc4random_uniform(101)` returns a uniformly distributed integer in `[0, 100]`.

### Implement on Android

The Kotlin signature for an async method takes a `Promise` parameter; resolve or reject it from a background thread.

Add this method skeleton to `android/app/src/main/java/com/nativemodulestraining/math/NativeMathModule.kt` (and add the imports at the top):

```kotlin
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Promise

// inside class NativeMathModule, after add():

override fun fetchScore(userId: String, promise: Promise) {
  // TODO 6.3
}
```

### Task 6.3

Implement `fetchScore`:

- If `userId.isEmpty()`, reject the promise with code `"empty_user_id"` and message `"userId cannot be empty"`.
- Otherwise, schedule a 1-second delay using `Handler(Looper.getMainLooper()).postDelayed`, then resolve with a random integer in `[0, 100]` (use `(0..100).random()`).

<details>
<summary><kbd>Show solution</kbd></summary>

```kotlin
  if (userId.isEmpty()) {
    promise.reject("empty_user_id", "userId cannot be empty")
    return
  }

  Handler(Looper.getMainLooper()).postDelayed({
    val score = (0..100).random()
    promise.resolve(score)
  }, 1000L)
```

</details>

`Promise` is `com.facebook.react.bridge.Promise`. Same contract as iOS: call `resolve` or `reject` exactly once. Forgetting to call either hangs the JS Promise.

`Handler(Looper.getMainLooper()).postDelayed` schedules the callback for delivery 1 second from now. For a workshop demo this is fine, but it is worth flagging as workshop-only: it ties your async work to the main looper, which is the wrong pattern for any work that takes meaningful time. In production code you would use Kotlin coroutines with a class-scoped `CoroutineScope` or a `ScheduledExecutorService` from a class-scoped pool, plus cancel them in `invalidate()`.

### Add the Async method Card to the screen

Update `src/screens/MathScreen.tsx` to import the `Activity` icon and `ActivityIndicator`, add async state and a handler, and render a third `Card`. The diff against Step 5's screen:

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
- `handleFetchScore` async handler that sets `loading`, awaits `NativeMath.fetchScore('user-123')`, stores the result, and clears `loading` in a `finally`
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
      const result = await NativeMath.fetchScore('user-123');
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

> Checkpoint after Step 6: rebuild on both platforms. The Math screen now has three Cards. Press Fetch on the Async method card; after roughly one second, a number appears. The button shows an `ActivityIndicator` while in flight, confirming the call is async and not blocking the UI thread.

> Reference: deck slide 27, right panel.

---

## Step 7 (stretch): Events with typed EventEmitter

Add an `onValueChanged` event that fires from native code every time `add` is called, plus a fourth Card that subscribes to it and displays the latest emitted value. Codegen handles the event-emitter wiring once you declare the field in the spec.

### Update the TS spec

Edit `src/specs/NativeMath.ts` to add the event emitter field. The full updated file looks like:

```typescript
import type { TurboModule } from 'react-native';
import type { EventEmitter } from 'react-native/Libraries/Types/CodegenTypes';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getConstants(): { pi: number };
  add(a: number, b: number): number;
  fetchScore(userId: string): Promise<number>;
  // TODO 7.1
}

export default TurboModuleRegistry.getEnforcing<Spec>('Math');
```

Note the new `EventEmitter` import on the second line.

### Task 7.1

Declare `onValueChanged` as a `readonly` field of type `EventEmitter<number>`.

<details>
<summary><kbd>Show solution</kbd></summary>

```typescript
  readonly onValueChanged: EventEmitter<number>;
```

</details>

The `EventEmitter<number>` type tells codegen the event payload is a single number. Codegen generates a typed emitter on the native side (`emitOnValueChanged(_:)` on iOS, `emitOnValueChanged(value: Double)` on Android) and a typed subscription helper on the JS side. The type parameter flows all the way through; mismatches between native emit and JS subscribe surface at compile time on both ends.

Run `cd ios && bundle exec pod install && cd ..` again to regenerate the iOS bindings.

### Emit from iOS

Modify your existing `add` implementation in `ios/NativeModulesTraining/RCTNativeMath.mm` to also fire the event. The new structure of the method is:

```objc
- (NSNumber *)add:(double)a b:(double)b {
  NSNumber *result = @(a + b);
  // TODO 7.2
  return result;
}
```

### Task 7.2

Call the codegen-generated emitter to fire `onValueChanged` with `result` as the value.

<details>
<summary><kbd>Show solution</kbd></summary>

```objc
  [self emitOnValueChanged:result];
```

</details>

The `emitOnValueChanged:` selector is generated by codegen onto `NativeMathSpecBase`, the abstract base class your header already inherits from (Step 3). You do not declare the selector; you just call it. The argument type matches what you declared in the TS spec (`number` becomes `NSNumber *` here).

### Emit from Android

Modify your existing `add` implementation in `android/app/src/main/java/com/nativemodulestraining/math/NativeMathModule.kt`. The new structure is:

```kotlin
override fun add(a: Double, b: Double): Double {
  val result = a + b
  // TODO 7.3
  return result
}
```

### Task 7.3

Call the codegen-generated emitter to fire `onValueChanged` with `result` as the value.

<details>
<summary><kbd>Show solution</kbd></summary>

```kotlin
  emitOnValueChanged(result)
```

</details>

`emitOnValueChanged(value: Double)` is generated on the abstract `NativeMathSpec` class. Same pattern as iOS: declare in the spec, codegen produces the emitter, your implementation just calls it.

### Add the Event Card to the screen

Update `src/screens/MathScreen.tsx` to import the `Bell` icon and `useEffect`, subscribe to the event, and render a fourth `Card`:

```tsx
import React, { useState, useEffect } from 'react';  // add useEffect
// ...
import { Pi, Plus, Activity, Bell } from 'lucide-react-native';  // add Bell
```

### Task 7.4

Add subscription state and a fourth Card. Specifically:

- `latestEmitted` state (`number | null`) and `eventCount` state (`number`)
- A `useEffect` that subscribes to `NativeMath.onValueChanged`, updates both states when the event fires, and returns a cleanup function that removes the subscription. Use an empty dependency array so it runs once on mount.
- A new `Card` (`icon={Bell}`, `label="Event"`, `kind="onValueChanged"`) showing the latest emitted value and the running event count

<details>
<summary><kbd>Show solution</kbd></summary>

State and effect (add after the existing async handler):

```tsx
  const [latestEmitted, setLatestEmitted] = useState<number | null>(null);
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    const subscription = NativeMath.onValueChanged((value) => {
      setLatestEmitted(value);
      setEventCount((prev) => prev + 1);
    });
    return () => subscription.remove();
  }, []);
```

JSX (add inside the `ScrollView`, after the Async method Card):

```tsx
      <Card icon={Bell} label="Event" kind="onValueChanged">
        <Text style={styles.value}>
          {latestEmitted === null
            ? 'no events yet'
            : `last value: ${latestEmitted}`}
        </Text>
        <Text style={styles.caption}>
          {eventCount} event{eventCount === 1 ? '' : 's'} received
        </Text>
      </Card>
```

</details>

`NativeMath.onValueChanged(handler)` returns a subscription object with a `remove()` method. Returning the cleanup from the `useEffect` ensures the subscription is removed when the component unmounts; without it, the subscription leaks on every navigation away from the Math tab and accumulates if you mount the screen multiple times.

> Final checkpoint: rebuild on both platforms. The Math screen now has four Cards: pi, add (which now updates two numbers when pressed because the emitter fires), fetch with loading state, and the live event subscription showing latest value plus running count. Each press of `add` updates two numbers (the immediate return value AND the event count). Compare your Exercise 01 final state against the `01-turbo-module` branch for any drift.

> Reference: deck slide 29, right panel.

---

## Compare with Exercise 02

When you finish this exercise, switch to `02-nitro-module` and notice three things:

1. The TS spec extends `HybridObject<{ ios: 'swift', android: 'kotlin' }>` instead of `TurboModule`, and `pi` becomes a bare `readonly pi: number` rather than living inside `getConstants()`.
2. The iOS implementation is pure Swift (no Obj-C++, no `.mm`, no resolver/rejecter blocks for async). Async methods use `throws -> Promise<T>` with `Promise.async { try await ... }`.
3. The Android implementation is pure Kotlin extending `HybridMathSpec()` directly, packaged as a separate library at `packages/nitro-math/` rather than living in the host app. Nitrogen handles most of the JNI layer; the small piece you have to write yourself (the `cpp-adapter.cpp` JNI_OnLoad and the load-order package) is documented step by step in Exercise 02's Step 4.

Those three differences are the diff between Turbo and Nitro at the module level. The view-level diff (Exercises 03 and 04) is similar in spirit but applied to native UI instead of native logic.

Visually, the Math and Math (Nitro) screens are deliberately identical in shell. Each Card on one tab corresponds to a Card on the other; the icon and `kind` text changes are the lesson. Read both `MathScreen.tsx` and `NitroMathScreen.tsx` side by side for the most concrete sense of the diff.
