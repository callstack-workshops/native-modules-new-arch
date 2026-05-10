import NitroModules
import Foundation

class HybridMath: HybridMathSpec {
  var pi: Double {
    return Double.pi
  }

  func add(a: Double, b: Double) throws -> Double {
    return a + b
  }

  func fetchScore(userId: String) throws -> Promise<Double> {
    if userId.isEmpty {
      throw RuntimeError.error(withMessage: "userId cannot be empty")
    }

    return Promise.async {
      try await Task.sleep(nanoseconds: 1_000_000_000)
      return Double(Int.random(in: 0...100))
    }
  }

  func startWork(onProgress: @escaping (Double) -> Void) throws {
    Task {
      for i in 1...10 {
        try await Task.sleep(nanoseconds: 50_000_000)
        onProgress(Double(i) / 10.0)
      }
    }
  }
}
