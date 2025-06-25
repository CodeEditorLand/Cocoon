var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Runtime } from "effect";
import { ApplicationClipboardProblem } from "./Clipboard/ApplicationClipboardProblem.js";
import {
  ReadImage,
  ReadResourceList,
  ReadText,
  WriteResourceList,
  WriteText,
  HasResourceList
} from "./Integration/Tauri/Clipboard/Wrapper.js";
const RunIntegrationEffect = /* @__PURE__ */ __name((IntegrationEffect) => {
  const MappedEffect = Effect.mapError(
    IntegrationEffect,
    (Cause) => new ApplicationClipboardProblem({ Cause })
  );
  return Runtime.runPromise(Runtime.defaultRuntime, MappedEffect);
}, "RunIntegrationEffect");
class ClipboardService extends Effect.Service()(
  "vscode/ClipboardService",
  {
    sync: /* @__PURE__ */ __name(() => ({
      _serviceBrand: void 0,
      triggerPaste: /* @__PURE__ */ __name((_TargetWindowId) => {
        return void 0;
      }, "triggerPaste"),
      writeText: /* @__PURE__ */ __name((Text) => {
        return RunIntegrationEffect(WriteText(Text));
      }, "writeText"),
      readText: /* @__PURE__ */ __name(() => {
        return RunIntegrationEffect(ReadText);
      }, "readText"),
      readFindText: /* @__PURE__ */ __name(function() {
        return this.readText();
      }, "readFindText"),
      writeFindText: /* @__PURE__ */ __name(function(Text) {
        return this.writeText(Text);
      }, "writeFindText"),
      writeResources: /* @__PURE__ */ __name((ResourceList) => {
        return RunIntegrationEffect(WriteResourceList(ResourceList));
      }, "writeResources"),
      readResources: /* @__PURE__ */ __name(() => {
        return RunIntegrationEffect(ReadResourceList);
      }, "readResources"),
      hasResources: /* @__PURE__ */ __name(() => {
        return RunIntegrationEffect(HasResourceList);
      }, "hasResources"),
      readImage: /* @__PURE__ */ __name(() => {
        return RunIntegrationEffect(ReadImage);
      }, "readImage")
    }), "sync")
  }
) {
  static {
    __name(this, "ClipboardService");
  }
}
export {
  ClipboardService
};
//# sourceMappingURL=Clipboard.js.map
