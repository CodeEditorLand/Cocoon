var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import * as Vscode from "vscode";
function ShowInformationMessage(Message, ...ItemsOrOptions) {
  return Effect.tryPromise({
    try: /* @__PURE__ */ __name(() => Vscode.window.showInformationMessage(Message, ...ItemsOrOptions), "try"),
    catch: /* @__PURE__ */ __name((error) => new Error(`Failed to show information message: ${error}`), "catch")
  });
}
__name(ShowInformationMessage, "ShowInformationMessage");
export {
  ShowInformationMessage
};
//# sourceMappingURL=ShowInformationMessage.js.map
