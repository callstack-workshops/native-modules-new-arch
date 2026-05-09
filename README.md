# Exercise 01: Build a Math module with Turbo Modules

> Reset your working tree to the `scaffold-v1` tag (`git reset --hard scaffold-v1`) and complete the steps below in your own checkout. Each task has a collapsible **Show solution** you can expand if you get stuck. The completed reference code for this exercise lives on the `01-turbo-module` branch (the same branch this README is on); once you finish, run `git diff 01-turbo-module` to see how your final state compares.

## What you will build

A `Math` Turbo Module exposing `pi` (a constant) and `add(a, b)` (a sync method) on both iOS and Android. By the end of the must-do steps (1 through 5), the Math screen reads `pi = 3.14159...` from native code and computes `add(2, 3) = 5` via a button press, on both platforms.

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

Edit `src/screens/MathScreen.tsx` to replace the placeholder content with calls into your module. Start with this skeleton:

```tsx
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import NativeMath from '../specs/NativeMath';

export function MathScreen() {
  // TODO 5.1
  const pi = 0;

  const [sum, setSum] = useState<number | null>(null);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>pi from native = {pi.toFixed(6)}</Text>
      <Text style={styles.label}>
        add(2, 3) = {sum === null ? 'press the button' : sum}
      </Text>
      <Pressable
        style={styles.button}
        // TODO 5.2
        onPress={() => {}}
      >
        <Text style={styles.buttonLabel}>Compute add(2, 3)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  label: { fontSize: 18 },
  button: { backgroundColor: '#0A84FF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  buttonLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
```

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

> Checkpoint after Step 5: rebuild the app on both platforms (`npx react-native run-ios --simulator="iPhone 16"` and `npx react-native run-android`). The Math screen should display `pi from native = 3.141593` and the button should populate `add(2, 3) = 5`. If the screen shows `pi = 0` or the button does nothing, the most likely cause is that the native side is not registered: check `RCT_EXPORT_MODULE(Math)` on iOS and the `MathPackage()` entry in `MainApplication.kt` on Android.

> Reference: deck slide 25, right panel.

---

## Step 6 (stretch): Async methods with Promise resolvers

Add a `fetchScore(userId)` method that returns a `Promise<number>`. The point of this step is the authoring difference, not the network call itself; we simulate the work with a one-second delay rather than a real HTTP request, to keep the workshop deterministic and offline-friendly. See Appendix A for the production-ready URLSession / HttpURLConnection variant.

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

### Use it from JavaScript

Update `src/screens/MathScreen.tsx` to add a Fetch score button alongside the existing pi display and add button. Start with this evolved skeleton:

```tsx
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import NativeMath from '../specs/NativeMath';

export function MathScreen() {
  const { pi } = NativeMath.getConstants();
  const [sum, setSum] = useState<number | null>(null);

  // TODO 6.4: add `score` and `loading` state, and a `handleFetchScore` async handler

  return (
    <View style={styles.container}>
      <Text style={styles.label}>pi from native = {pi.toFixed(6)}</Text>
      <Text style={styles.label}>
        add(2, 3) = {sum === null ? 'press the button' : sum}
      </Text>
      <Pressable style={styles.button} onPress={() => setSum(NativeMath.add(2, 3))}>
        <Text style={styles.buttonLabel}>Compute add(2, 3)</Text>
      </Pressable>

      {/* TODO 6.4: add a Text showing the score, and a Pressable that calls handleFetchScore */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  label: { fontSize: 18 },
  button: { backgroundColor: '#0A84FF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  buttonLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
```

### Task 6.4

Add async state and a Fetch score button. You need:

- `score` and `loading` state (both nullable / boolean as appropriate)
- An async `handleFetchScore` that sets `loading`, awaits `NativeMath.fetchScore('user-123')`, stores the result, and clears `loading` in a `finally`
- A new `Text` showing the score (with a "loading..." placeholder while in flight) and a `Pressable` wired to `handleFetchScore` (disabled while loading)

<details>
<summary><kbd>Show solution</kbd></summary>

Add the state and handler at the top of the component:

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

Add the new JSX inside the outer `View`, after the existing add Pressable:

```tsx
      <Text style={styles.label}>
        score = {loading ? 'loading...' : score === null ? 'press the button' : score}
      </Text>
      <Pressable style={styles.button} onPress={handleFetchScore} disabled={loading}>
        <Text style={styles.buttonLabel}>Fetch score</Text>
      </Pressable>
```

</details>

> Checkpoint after Step 6: rebuild on both platforms. Press "Fetch score". After roughly one second, a number between 0 and 100 appears. The "loading..." label confirms the call is async and not blocking the UI thread.

> Reference: deck slide 27, right panel.

---

## Step 7 (stretch): Events with typed EventEmitter

Add an `onValueChanged` event that fires from native code every time `add` is called, and have the JS side subscribe to it. Codegen handles the event-emitter wiring once you declare the field in the spec.

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

### Subscribe from JavaScript

Update `src/screens/MathScreen.tsx` to subscribe to `onValueChanged` and display the latest emitted value. Start with this evolved skeleton:

```tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import NativeMath from '../specs/NativeMath';

export function MathScreen() {
  const { pi } = NativeMath.getConstants();
  const [sum, setSum] = useState<number | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [latestEmitted, setLatestEmitted] = useState<number | null>(null);

  // TODO 7.4: subscribe to NativeMath.onValueChanged in a useEffect, and unsubscribe on cleanup

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

  return (
    <View style={styles.container}>
      <Text style={styles.label}>pi from native = {pi.toFixed(6)}</Text>
      <Text style={styles.label}>
        add(2, 3) = {sum === null ? 'press the button' : sum}
      </Text>
      <Pressable style={styles.button} onPress={() => setSum(NativeMath.add(2, 3))}>
        <Text style={styles.buttonLabel}>Compute add(2, 3)</Text>
      </Pressable>

      <Text style={styles.label}>
        score = {loading ? 'loading...' : score === null ? 'press the button' : score}
      </Text>
      <Pressable style={styles.button} onPress={handleFetchScore} disabled={loading}>
        <Text style={styles.buttonLabel}>Fetch score</Text>
      </Pressable>

      <Text style={styles.label}>
        last emitted value = {latestEmitted === null ? 'no events yet' : latestEmitted}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  label: { fontSize: 18 },
  button: { backgroundColor: '#0A84FF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  buttonLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
```

### Task 7.4

In a `useEffect`, subscribe to `NativeMath.onValueChanged`, store the emitted value via `setLatestEmitted`, and return a cleanup function that removes the subscription. Use an empty dependency array so it runs once on mount.

<details>
<summary><kbd>Show solution</kbd></summary>

```tsx
  useEffect(() => {
    const subscription = NativeMath.onValueChanged((value) => {
      setLatestEmitted(value);
    });
    return () => subscription.remove();
  }, []);
```

</details>

`NativeMath.onValueChanged(handler)` returns a subscription object with a `remove()` method. Returning the cleanup from the `useEffect` ensures the subscription is removed when the component unmounts; without it, the subscription leaks on every navigation away from the Math tab and accumulates if you mount the screen multiple times.

> Final checkpoint: rebuild both platforms. The Math screen now shows pi, an `add(2, 3)` button that fills in `sum` AND updates the "last emitted value" line, a "Fetch score" button with the async loading state, and the live event subscription. Each press of `add` updates two numbers (the immediate return value and the event-driven state). Compare your Exercise 01 final state against the `01-turbo-module` branch for any drift.

> Reference: deck slide 29, right panel.

---

## Compare with Exercise 02

When you finish this exercise, switch to `02-nitro-module` and notice three things:

1. The TS spec extends `HybridObject<{ ios: 'swift', android: 'kotlin' }>` instead of `TurboModule`, and `pi` becomes a bare `readonly pi: number` rather than living inside `getConstants()`.
2. The iOS implementation is pure Swift (no Obj-C++, no `.mm`, no resolver/rejecter blocks for async). Async methods use `throws -> Promise<T>` with `Promise.async { try await ... }`.
3. The Android implementation is pure Kotlin extending `HybridMathSpec()` directly, with no separate `Package` class to register. Nitrogen handles the JNI layer.

Those three differences are the diff between Turbo and Nitro at the module level. The view-level diff (Exercises 03 and 04) is similar in spirit but applied to native UI instead of native logic.
