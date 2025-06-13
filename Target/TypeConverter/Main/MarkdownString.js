var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { MarkdownString } from "../../Type/ExtHostTypes.js";
function FromAPI(MarkdownStringInstance) {
  return {
    value: MarkdownStringInstance.value,
    isTrusted: MarkdownStringInstance.isTrusted
    // Note: The `uris` property, used for managing related resources,
    // would need to be serialized here if supported.
  };
}
__name(FromAPI, "FromAPI");
function ToAPI(MarkdownStringDTO) {
  const result = new MarkdownString(
    MarkdownStringDTO.value,
    MarkdownStringDTO.isTrusted
  );
  return result;
}
__name(ToAPI, "ToAPI");
export {
  FromAPI,
  ToAPI
};
//# sourceMappingURL=MarkdownString.js.map
