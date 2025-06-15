var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { ThemeColor } from "vscode";
import MarkdownStringConverter from "./Main/MarkdownString.js";
const FromAPI = /* @__PURE__ */ __name((From, EntryID, CommandConverter) => {
  return {
    id: EntryID,
    name: From.name,
    text: From.text,
    tooltip: typeof From.tooltip === "string" ? From.tooltip : From.tooltip instanceof ExtHostTypes.MarkdownString ? MarkdownStringConverter.FromAPI(From.tooltip) : void 0,
    command: From.command ? CommandConverter.ToInternal(From.command, []) : void 0,
    priority: From.priority,
    alignment: From.alignment === ExtHostTypes.StatusBarAlignment.Left ? 0 : 1,
    backgroundColor: From.backgroundColor instanceof ThemeColor ? From.backgroundColor.id : void 0,
    color: typeof From.color === "string" ? From.color : From.color instanceof ThemeColor ? From.color.id : void 0,
    accessibilityInformation: From.accessibilityInformation
  };
}, "FromAPI");
var StatusBar_default = { FromAPI };
export {
  StatusBar_default as default
};
//# sourceMappingURL=StatusBar.js.map
