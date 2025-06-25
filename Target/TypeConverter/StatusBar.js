var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Command as CommandConverter } from "./Command.js";
import { MarkdownString, ThemeColor } from "../Platform/VSCode/Type.js";
import { FromAPI as MarkdownStringFromAPI } from "./Main/MarkdownString.js";
const FromAPI = /* @__PURE__ */ __name((From, EntryId, _ExtensionId, CommandConverter2) => {
  return {
    id: EntryId,
    name: From.name,
    text: From.text,
    tooltip: typeof From.tooltip === "string" ? From.tooltip : From.tooltip instanceof MarkdownString ? MarkdownStringFromAPI(From.tooltip) : void 0,
    command: From.command ? CommandConverter2.ToInternal(From.command, []) : void 0,
    priority: From.priority,
    alignment: From.alignment === 1 ? 0 : 1,
    backgroundColor: From.backgroundColor instanceof ThemeColor ? From.backgroundColor.id : void 0,
    color: typeof From.color === "string" ? From.color : From.color instanceof ThemeColor ? From.color.id : void 0,
    accessibilityInformation: From.accessibilityInformation
  };
}, "FromAPI");
export {
  FromAPI
};
//# sourceMappingURL=StatusBar.js.map
