Pod::Spec.new do |s|
  s.name         = "NitroMath"
  s.version      = "0.0.1"
  s.summary      = "Workshop local Nitro Math module"
  s.homepage     = "https://github.com/callstack-workshops/native-modules-new-arch"
  s.license      = "MIT"
  s.author       = "Callstack"
  s.platforms    = { :ios => "15.1" }
  s.source       = { :git => "" }

  # The user's hand-written Swift implementation
  s.source_files = "ios/**/*.{h,m,mm,swift}"

  # Apply nitrogen's autolinking helper. Globs in autolinking.rb are relative
  # to this podspec; co-locating the podspec with the nitrogen/ folder
  # makes them resolve correctly.
  load 'nitrogen/generated/ios/NitroMath+autolinking.rb'
  add_nitrogen_files(s)
end
