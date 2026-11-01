import Capacitor
import GameKit
import UIKit

/// Optional platform service. Gameplay and local saves never depend on a successful sign-in.
@objc(VeylithGameCenterPlugin)
public final class VeylithGameCenterPlugin: CAPPlugin, CAPBridgedPlugin,
    GKGameCenterControllerDelegate, UIAdaptivePresentationControllerDelegate {
    public let identifier = "VeylithGameCenterPlugin"
    public let jsName = "VeylithGameCenter"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showDashboard", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "submitScore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reportAchievement", returnType: CAPPluginReturnPromise)
    ]

    private var didInstallAuthentication = false
    private var authenticationCall: CAPPluginCall?
    private var dashboardCall: CAPPluginCall?
    private var authenticationController: UIViewController?
    private weak var displayedController: UIViewController?
    private var activeObserver: NSObjectProtocol?
    private var authenticationWatchdog: Timer?
    private var authenticationDeadline = Date.distantFuture

    public override func load() {
        activeObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main
        ) { [weak self] _ in self?.publishStatus() }
    }

    deinit {
        authenticationWatchdog?.invalidate()
        if let activeObserver = activeObserver { NotificationCenter.default.removeObserver(activeObserver) }
    }

    private func status() -> JSObject {
        let player = GKLocalPlayer.local
        var result: JSObject = ["available": true, "authenticated": player.isAuthenticated]
        if player.isAuthenticated {
            result["playerId"] = player.gamePlayerID
            result["displayName"] = player.displayName
        }
        return result
    }

    private func publishStatus() { notifyListeners("authStateChanged", data: status()) }
    private func publishUI(_ active: Bool) { notifyListeners("uiStateChanged", data: ["active": active]) }

    @objc func getStatus(_ call: CAPPluginCall) {
        DispatchQueue.main.async { call.resolve(self.status()) }
    }

    @objc func authenticate(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.authenticationCall == nil, self.displayedController == nil else {
                call.reject("Game Center is already showing a screen.", "BUSY")
                return
            }
            self.authenticationCall = call
            self.startAuthenticationWatchdog()
            if let controller = self.authenticationController {
                self.presentAuthentication(controller)
            } else if self.didInstallAuthentication {
                // GameKit decides whether a declined sign-in can be shown again. Do not nag or loop.
                self.finishAuthentication()
            } else {
                self.didInstallAuthentication = true
                GKLocalPlayer.local.authenticateHandler = { [weak self] controller, _ in
                    DispatchQueue.main.async {
                        guard let self = self else { return }
                        if let controller = controller {
                            self.authenticationController = controller
                            self.presentAuthentication(controller)
                        } else {
                            self.authenticationController = nil
                            self.finishAuthentication()
                        }
                    }
                }
            }
        }
    }

    private func startAuthenticationWatchdog() {
        authenticationWatchdog?.invalidate()
        authenticationDeadline = Date().addingTimeInterval(60)
        authenticationWatchdog = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] timer in
            guard let self = self else { timer.invalidate(); return }
            // Some OS versions omit the final cancel callback. Recover only after the UI is gone.
            if let controller = self.authenticationController, self.displayedController === controller,
               controller.presentingViewController == nil, controller.viewIfLoaded?.window == nil {
                self.authenticationController = nil
                self.finishAuthentication()
                return
            }
            if Date() >= self.authenticationDeadline, let call = self.authenticationCall {
                // Report the actual current state; never force-dismiss an Apple sign-in screen.
                call.resolve(self.status())
                self.authenticationCall = nil
                self.publishStatus()
            }
            if self.authenticationCall == nil, self.displayedController == nil {
                timer.invalidate()
                self.authenticationWatchdog = nil
            }
        }
    }

    private func presenter() -> UIViewController? {
        guard let controller = bridge?.viewController,
              controller.viewIfLoaded?.window != nil,
              controller.presentedViewController == nil else { return nil }
        return controller
    }

    private func presentAuthentication(_ controller: UIViewController) {
        startAuthenticationWatchdog()
        guard displayedController == nil, let presenter = presenter() else {
            authenticationCall?.reject("Game Center sign-in cannot be presented right now.", "UI_UNAVAILABLE")
            authenticationCall = nil
            return
        }
        displayedController = controller
        publishUI(true)
        presenter.present(controller, animated: true) {
            controller.presentationController?.delegate = self
        }
    }

    private func finishAuthentication() {
        // GameKit dismisses its authentication controller itself when initialization completes.
        if displayedController === authenticationController || dashboardCall == nil {
            displayedController = nil
            publishUI(false)
        }
        publishStatus()
        authenticationCall?.resolve(status())
        authenticationCall = nil
        authenticationWatchdog?.invalidate()
        authenticationWatchdog = nil
    }

    @objc func showDashboard(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard GKLocalPlayer.local.isAuthenticated else {
                call.reject("Game Center is not signed in.", "NOT_AUTHENTICATED")
                return
            }
            guard let view = call.getString("view"), ["leaderboards", "achievements"].contains(view) else {
                call.reject("Unsupported Game Center view.", "INVALID_ARGUMENT")
                return
            }
            guard self.authenticationCall == nil, self.displayedController == nil,
                  let presenter = self.presenter() else {
                call.reject("Another screen is already open.", "UI_UNAVAILABLE")
                return
            }
            let controller = GKGameCenterViewController(state: view == "achievements" ? .achievements : .leaderboards)
            controller.gameCenterDelegate = self
            self.dashboardCall = call
            self.displayedController = controller
            self.publishUI(true)
            presenter.present(controller, animated: true) {
                controller.presentationController?.delegate = self
            }
        }
    }

    public func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
        gameCenterViewController.dismiss(animated: true) { self.finishDashboard() }
    }

    public func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
        if dashboardCall != nil {
            finishDashboard()
        } else {
            authenticationController = nil
            finishAuthentication()
        }
    }

    private func finishDashboard() {
        displayedController = nil
        publishUI(false)
        publishStatus()
        dashboardCall?.resolve()
        dashboardCall = nil
    }

    private func validatePlayer(_ call: CAPPluginCall) -> String? {
        let player = GKLocalPlayer.local
        guard player.isAuthenticated else {
            call.reject("Game Center is not signed in.", "NOT_AUTHENTICATED")
            return nil
        }
        guard let expected = call.getString("playerId"), !expected.isEmpty,
              expected == player.gamePlayerID else {
            call.reject("The Game Center player changed. This result was not submitted.", "PLAYER_CHANGED")
            return nil
        }
        return expected
    }

    private func finishSubmission(_ call: CAPPluginCall, playerID: String, error: Error?) {
        // Return only stable codes, never native errors containing account/configuration details.
        guard GKLocalPlayer.local.isAuthenticated, GKLocalPlayer.local.gamePlayerID == playerID else {
            call.reject("The Game Center player changed during submission.", "PLAYER_CHANGED")
            return
        }
        if error != nil {
            call.reject("Game Center could not accept the result. Local progress is unaffected.", "SUBMISSION_FAILED")
        } else {
            call.resolve()
        }
    }

    @objc func submitScore(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let identifier = call.getString("leaderboardId"), GameCenterCatalog.leaderboards.contains(identifier),
                  let score = GameCenterCatalog.score(call.getDouble("score")) else {
                call.reject("Expected an allowed leaderboard and a positive whole-millisecond time.", "INVALID_ARGUMENT")
                return
            }
            guard let playerID = self.validatePlayer(call) else { return }
            GKLeaderboard.submitScore(score, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [identifier]) { error in
                DispatchQueue.main.async { self.finishSubmission(call, playerID: playerID, error: error) }
            }
        }
    }

    @objc func reportAchievement(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let identifier = call.getString("achievementId"), GameCenterCatalog.achievements.contains(identifier),
                  let percent = call.getDouble("percentComplete"), percent.isFinite, (0...100).contains(percent) else {
                call.reject("Expected an allowed achievement and progress between zero and 100.", "INVALID_ARGUMENT")
                return
            }
            guard let playerID = self.validatePlayer(call) else { return }
            let achievement = GKAchievement(identifier: identifier)
            achievement.percentComplete = percent
            achievement.showsCompletionBanner = true
            GKAchievement.report([achievement]) { error in
                DispatchQueue.main.async { self.finishSubmission(call, playerID: playerID, error: error) }
            }
        }
    }
}
