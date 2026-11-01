import Capacitor

final class GameViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(VeylithGameCenterPlugin())
    }
}
