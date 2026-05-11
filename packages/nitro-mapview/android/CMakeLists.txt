cmake_minimum_required(VERSION 3.22.1)

# Project name MUST match androidCxxLibName in nitro.json
project(NitroMapView)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Create the library target. autolinking.cmake adds the actual nitrogen sources
# via target_sources, but add_library requires at least one source file to start.
file(WRITE "${CMAKE_BINARY_DIR}/dummy.cpp"
  "// Placeholder source for NitroMapView. Real sources added by NitroMapView+autolinking.cmake.\n")
add_library(NitroMapView SHARED "${CMAKE_BINARY_DIR}/dummy.cpp")

# Include nitrogen's autolinking. CMAKE_SOURCE_DIR is android/ inside the library,
# and ../nitrogen/... resolves to the library's nitrogen/ folder.
include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/NitroMapView+autolinking.cmake)

# JNI_OnLoad. Required so System.loadLibrary("NitroMapView") triggers
# registerAllNatives(), which adds the "MapView" HybridObject to the registry
# JS later queries via getHostComponent('MapView').
target_sources(NitroMapView PRIVATE ${CMAKE_SOURCE_DIR}/src/main/cpp/cpp-adapter.cpp)
