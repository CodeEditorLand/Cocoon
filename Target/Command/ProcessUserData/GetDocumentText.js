var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
const GetDocumentText = /* @__PURE__ */ __name((Document) => {
  return Effect.sync(() => Document.getText());
}, "GetDocumentText");
var GetDocumentText_default = GetDocumentText;
export {
  GetDocumentText_default as default
};
//# sourceMappingURL=GetDocumentText.js.map
