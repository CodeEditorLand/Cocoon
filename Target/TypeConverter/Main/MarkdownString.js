var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { MarkdownString } from "../../Type/ExtHostTypes.js";
const FromAPI = /* @__PURE__ */ __name((MarkdownStringInstance) => ({
  value: MarkdownStringInstance.value,
  isTrusted: MarkdownStringInstance.isTrusted
  // Note: The `uris` property, used for managing related resources,
  // would need to be serialized here if supported.
}), "FromAPI");
const ToAPI = /* @__PURE__ */ __name((MarkdownStringDTO) => new MarkdownString(MarkdownStringDTO.value, MarkdownStringDTO.isTrusted), "ToAPI");
var MarkdownString_default = { FromAPI, ToAPI };
export {
  MarkdownString_default as default
};
//# sourceMappingURL=MarkdownString.js.map
