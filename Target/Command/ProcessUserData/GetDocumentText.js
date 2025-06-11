var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
const GetDocumentText = /* @__PURE__ */ __name((Document) => Effect.sync(() => Document.getText()), "GetDocumentText");
export {
  GetDocumentText
};
//# sourceMappingURL=GetDocumentText.js.map
