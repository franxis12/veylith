import Foundation

/// These IDs must be configured and approved in App Store Connect before release.
enum GameCenterCatalog {
    static let prefix = "com.francismartinez.veylith"
    static let leaderboards = Set((1...10).map { "\(prefix).forest\($0).time" })
    static let achievements: Set<String> = ["\(prefix).first_win", "\(prefix).earth_complete"]
    // Finite, positive whole milliseconds, bounded to one day per attempt.
    static let maximumTimeMilliseconds = 86_400_000.0

    static func score(_ value: Double?) -> Int? {
        guard let value = value, value.isFinite, value >= 1,
              value <= maximumTimeMilliseconds, value.rounded(.down) == value else { return nil }
        return Int(value)
    }
}
