// RBOARDNoAccessory.swift · add-only 20261109-t195u
// Hides WKWebView's system input accessory bar (prev / next / Done) while in-app RBOARD is open.
// NOT App.swift. This file is not yet in the Xcode target (pbxproj lists Swift files
// explicitly; version bump / pbxproj edits are reserved for ABOT's build-39 patch).
// To compile: add this file to the DragonSkull target, then call RBOARDNoAccessory.install()
// once after the chat WKWebView is created — or rely on the file-scope bootstrap below.
import UIKit
import WebKit

enum RBOARDNoAccessory {
    private static var installed = false
    /// Swizzles WKContentView.inputAccessoryView to return nil.
    static func install() {
        if installed { return }
        installed = true
        guard let cls = NSClassFromString("WKContentView") as? UIView.Type else { return }
        let sel = #selector(getter: UIResponder.inputAccessoryView)
        guard let method = class_getInstanceMethod(cls, sel) else { return }
        let block: @convention(block) (AnyObject) -> UIView? = { _ in nil }
        let imp = imp_implementationWithBlock(block)
        method_setImplementation(method, imp)
    }
}

private let _rboardNoAccessoryBootstrap: Void = {
    RBOARDNoAccessory.install()
    return ()
}()
