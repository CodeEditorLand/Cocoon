var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
function GetDocumentText(Document) {
  return Effect.sync(() => Document.getText());
}
__name(GetDocumentText, "GetDocumentText");
export {
  GetDocumentText
};
//# sourceMappingURL=GetDocumentText.js.map
