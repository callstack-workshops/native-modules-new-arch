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

The most common issue when switching branches is a stale native binary that does not match the current branch's native code or pods. If you see overlays like "Unimplemented component" or unexplained crashes on launch, do a clean rebuild on the affected platform.

iOS:

```bash
rm -rf ~/Library/Developer/Xcode/DerivedData
cd ios && rm -rf build Pods Podfile.lock && bundle exec pod install && cd ..
npx react-native start --reset-cache
npx react-native run-ios --simulator="iPhone 16"
```

Android:

```bash
cd android && ./gradlew clean && cd ..
npx react-native start --reset-cache
npx react-native run-android
```

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
- The slide deck this workshop is based on: TBD link
