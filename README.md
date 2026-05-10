# React Native New Architecture Workshop

A hands-on workshop covering native modules and components on React Native's New Architecture, using both Turbo Modules / Fabric and the Nitro frameworks.

The workshop is structured around four exercises that each build the same surface (a `Math` module and a `MapView` component) in both frameworks, so the diff between Turbo and Nitro is the lesson.

## Exercises

| Exercise                                                                                            | Topic                                       | Branch |
|-----------------------------------------------------------------------------------------------------|---------------------------------------------|---|
| [01](https://github.com/callstack-workshops/native-modules-new-arch/blob/01-turbo-module/README.md) | Math module with Turbo Modules              | `01-turbo-module` |
| [02](https://github.com/callstack-workshops/native-modules-new-arch/blob/02-nitro-module/README.md) | Math module with Nitro Modules              | `02-nitro-module` |
| [03](https://github.com/callstack-workshops/native-modules-new-arch/blob/03-turbo-component/README.md) | MapView with Turbo Components (coming soon) | `03-turbo-component` |
| [04](https://github.com/callstack-workshops/native-modules-new-arch/blob/04-nitro-component/README.md) | MapView with Nitro Components (coming soon) | `04-nitro-component` |

Each exercise lives on its own branch. The branch contains only that exercise's implementation in isolation, plus a README walkthrough that tells the story of how the code was built. Every step poses a task, gives you a code skeleton with a `// TODO` marker, and provides a collapsible **Show solution** you can expand if you get stuck or want to verify your approach.

## How this repository is organized

The default branch (`00-guidance`) contains the integrated final product: all four exercises completed and running together in the same app. Cloning the default branch and running the app gives you a working build with every module and component the workshop covers.

The pristine pre-exercise scaffold state of the repository is preserved at the `scaffold-v1` git tag. If you want to start the workshop from a clean slate locally, `git reset --hard scaffold-v1` puts your working tree at the same state students see at the beginning of the workshop.

## Recommended workflow

If you are working through the exercises self-paced, the easiest path is:

1. Clone the repo and reset to `scaffold-v1` (`git reset --hard scaffold-v1` after cloning).
2. Open the README on the exercise branch you want to work on (in the GitHub UI, or via `git show 01-turbo-module:README.md`).
3. Follow the walkthrough, trying each task before expanding the solution.
4. When you finish, compare your tree against the exercise branch with `git diff 01-turbo-module`.

If you are attending a guided workshop, follow your instructor's pace; the per-exercise branches will be referenced as we go.

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
npx react-native run-ios
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

## Resources

- [Nitro Modules documentation](https://nitro.margelo.com/)
- [React Native New Architecture documentation](https://reactnative.dev/docs/the-new-architecture/landing-page)
- [react-native-vision-camera](https://github.com/mrousavy/react-native-vision-camera): real-world Nitro module example
- [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv): real-world Nitro module example
- The slide deck this workshop is based on: https://docs.google.com/presentation/d/1ksJR_ttgZASWvXH8zb6rf2vCg0sHnL1P
