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
