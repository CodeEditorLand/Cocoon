var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { IntegrationClipboardProblem } from "./Problem.js";
const MakeStub = /* @__PURE__ */ __name((Name, DefaultValue) => Effect.logWarning(
  `Clipboard Integration: Function '${Name}' is a stub.`
).pipe(Effect.as(DefaultValue)), "MakeStub");
const WriteText = /* @__PURE__ */ __name((_text) => MakeStub("WriteText", void 0), "WriteText");
const ReadText = MakeStub("ReadText", "");
const WriteResourceList = /* @__PURE__ */ __name((_resourceList) => MakeStub("WriteResourceList", void 0), "WriteResourceList");
const ReadResourceList = MakeStub("ReadResourceList", []);
const HasResourceList = MakeStub("HasResourceList", false);
export {
  HasResourceList,
  ReadResourceList,
  ReadText,
  WriteResourceList,
  WriteText
};
//# sourceMappingURL=Wrapper.js.map
