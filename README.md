# Working with Native Modules: Turbo and Nitro

A hands-on workshop for building React Native native modules and native components on the New Architecture, using both Turbo Modules / Fabric and the Nitro frameworks.

The workshop is structured around four exercises that each build the same surface (a `Math` module and a `MapView` component) in both frameworks, so the diff between Turbo and Nitro is the lesson.

## Agenda

The full walkthrough for every exercise lives in [GUIDANCE.md](./GUIDANCE.md). Each exercise is its own branch off `00-guidance`:

1. `01-turbo-module`: build the `Math` module with Turbo Modules (codegen, Obj-C++ on iOS, Kotlin on Android, sync + async + events).
2. `02-nitro-module`: build the same `Math` module with Nitro (nitrogen, Swift on iOS, Kotlin on Android, sync + async + first-class callbacks).
3. `03-turbo-component`: build a `MapView` component with Fabric (`RCTViewComponentView` on iOS, `SimpleViewManager` on Android, MKMapView and MapLibre under the hood).
4. `04-nitro-component`: build the same `MapView` with Nitro HybridView (Swift on iOS, Kotlin on Android).

If you get stuck on any exercise, every exercise has a matching solution tag you can check out:

```bash
git checkout solutions/01-turbo-module
```

Return to your in-progress branch with \`git checkout 01-turbo-module\`.

## Prerequisites

- Node 20 or newer
- Xcode 16 or newer (tested on Xcode 26)
- Ruby 3.2+ with Bundler 2.7+
- CocoaPods 1.16+
- Android Studio with JDK 17 and Android SDK 34
- A configured iOS Simulator (iPhone 16 recommended) and Android Emulator

## Setup

```bash
git clone https://github.com/callstack-workshops/native-modules-new-arch.git
cd native-modules-new-arch
npm install
cd ios && bundle install && bundle exec pod install && cd ..
```

## Running the app

Run Metro in its own terminal:

```bash
npm start
```

Then in a second terminal, pick a platform:

```bash
npx react-native run-ios --simulator="iPhone 16"
# or
npx react-native run-android
```

The explicit `--simulator` flag prevents `run-ios` from targeting a connected physical iPhone, which fails on a fresh clone because no signing team is configured.

## Troubleshooting

This section grows as we discover more issues during workshop sessions.

### Build fails with `RCTNativeMathSpec/RCTNativeMathSpec.h not found` (or any codegen header)

The codegen-generated headers do not exist on disk until your first `npx react-native run-ios` (or `run-android`) runs after adding a spec. If you are creating native module files BEFORE running the app, you will hit this. Fix:

```bash
cd ios && bundle exec pod install && cd ..
```

Then verify the generated header exists:

```bash
ls ios/build/generated/ios/ReactCodegen/
```

You should see one folder per Turbo Module spec.

### iOS build fails with `no visible @interface for X declares the selector emit...`

Your class is conforming to the codegen protocol but inheriting from `NSObject`. The codegen-generated emitters live on a base CLASS (e.g. `NativeMathSpecBase`), not on the protocol. Change the class declaration in `<YourModule>.h`:

```objc
// before
@interface MyModule : NSObject <MyModuleSpec>
// after
@interface MyModule : MyModuleSpecBase <MyModuleSpec>
```

### Android build fails with `'getConstants' in 'X' is final and cannot be overridden`

RN 0.85 changed the constants API on Android Turbo Modules. The correct override is `getTypedExportedConstants()`, not `getConstants()`:

```kotlin
override fun getTypedExportedConstants(): Map<String, Any> = mapOf(...)
```

### Phantom "method not found" errors after adding files in Xcode

When you "Add Files to Project" in Xcode for a native module, the dialog asks "Action: Copy files to destination / Move files to destination / Reference files in place". If you accidentally chose "Copy files to destination", Xcode created stray duplicates at `ios/<file>.{h,mm}` (without the project subfolder). The duplicates compile alongside your real files and produce confusing errors.

Pre-flight check after adding any native module file:

```bash
find ios -name "<YourModuleName>.*" -not -path "*/build/*"
```

You should see exactly two paths, both inside `ios/<ProjectName>/`. If you see four (with strays at the `ios/` root), delete the strays from disk AND remove their references from Xcode, then re-add the originals choosing "Reference files in place".

When adding `.h`/`.mm` files to a Swift-containing project, Xcode also prompts to create a bridging header. Click "Don't Create" unless the rest of your codebase actually needs Obj-C-from-Swift bridging.

### Build is mysteriously broken, want a clean slate

Two valid reset levels. Pick by severity.

Light reset (preserves codegen output, faster, sufficient for stale-binary issues):

```bash
rm -rf ~/Library/Developer/Xcode/DerivedData
```

Heavy reset (full wipe, slower, required when the iOS workspace itself is corrupted):

```bash
rm -rf ~/Library/Developer/Xcode/DerivedData
cd ios && rm -rf build Pods Podfile.lock && bundle exec pod install && cd ..
```

Do NOT run `rm -rf ios/build` without the `pod install` immediately afterwards. That deletes codegen output and the next build fails on missing generated files.

## Pinned dependencies and known issues

This repo pins certain native dependencies and configures Xcode to work around current ecosystem regressions:

- `react-native-screens` is pinned to `4.23.0`. Versions `4.24.0` and newer have a New Architecture regression on iOS (see [software-mansion/react-native-screens#3682](https://github.com/software-mansion/react-native-screens/issues/3682)).
- The iOS Podfile sets `SWIFT_ENABLE_EXPLICIT_MODULES=NO` for all pod targets to work around a Swift module compilation issue with Xcode 26.
- `.npmrc` sets `save-exact=true` so every future `npm install foo` writes a hard pin.

See [MAINTENANCE.md](./MAINTENANCE.md) for the condition under which each pin can be removed.

## Resources

- [Nitro Modules documentation](https://nitro.margelo.com/)
- [React Native New Architecture documentation](https://reactnative.dev/docs/the-new-architecture/landing-page)
- [react-native-vision-camera](https://github.com/mrousavy/react-native-vision-camera): real-world Nitro module example
- [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv): real-world Nitro module example
- The slide deck this workshop is based on: https://docs.google.com/presentation/d/1ksJR_ttgZASWvXH8zb6rf2vCg0sHnL1P
