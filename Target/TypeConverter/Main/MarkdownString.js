var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { MarkdownString } from "../../Platform/VSCode/Type.js";
const FromAPI = /* @__PURE__ */ __name((MarkdownStringInstance) => ({
  value: MarkdownStringInstance.value,
  isTrusted: MarkdownStringInstance.isTrusted,
  baseUri: MarkdownStringInstance.baseUri,
  supportHtml: MarkdownStringInstance.supportHtml
}), "FromAPI");
const ToAPI = /* @__PURE__ */ __name((MarkdownStringDTO) => {
  const result = new MarkdownString(
    MarkdownStringDTO.value,
    typeof MarkdownStringDTO.isTrusted === "boolean" ? MarkdownStringDTO.isTrusted : !!MarkdownStringDTO.isTrusted
  );
  result.baseUri = MarkdownStringDTO.baseUri;
  result.supportHtml = MarkdownStringDTO.supportHtml;
  return result;
}, "ToAPI");
export {
  FromAPI,
  ToAPI
};
//# sourceMappingURL=MarkdownString.js.map
