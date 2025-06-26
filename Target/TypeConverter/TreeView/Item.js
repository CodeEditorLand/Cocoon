var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { TreeItemCollapsibleState } from "vscode";
import * as ExtHostTypes from "../../Platform/VSCode/Type.js";
import { FromAPI as MarkdownStringFromAPI } from "../Main/MarkdownString.js";
import { FromAPI as UriFromAPI, ToAPI as UriToAPI } from "../Main/URI.js";
const FromAPI = /* @__PURE__ */ __name((_extension, item, handle, parentHandle, commandConverter) => {
  const {
    label: Label,
    id: Id,
    iconPath: IconPath,
    resourceUri: ResourceUri,
    tooltip: Tooltip,
    collapsibleState: CollapsibleStateValue,
    contextValue: ContextValue,
    description: Description,
    command: Command,
    accessibilityInformation: AccessibilityInformation
  } = item;
  let ThemeIcon;
  let Icon;
  if (IconPath instanceof ExtHostTypes.ThemeIcon) {
    ThemeIcon = {
      id: IconPath.id,
      color: IconPath.color?.id
    };
  } else {
    Icon = IconPath;
  }
  return {
    handle,
    parentHandle,
    label: typeof Label === "string" ? { label: Label } : Label,
    id: Id,
    description: Description,
    resourceUri: ResourceUri ? UriFromAPI(ResourceUri) : void 0,
    tooltip: typeof Tooltip === "string" ? Tooltip : Tooltip instanceof ExtHostTypes.MarkdownString ? MarkdownStringFromAPI(Tooltip) : void 0,
    command: Command ? commandConverter.ToInternal(Command, []) : void 0,
    collapsibleState: CollapsibleStateValue ?? TreeItemCollapsibleState.None,
    contextValue: ContextValue,
    themeIcon: ThemeIcon,
    icon: Icon ? "light" in Icon && "dark" in Icon ? {
      light: UriFromAPI(Icon.light),
      dark: UriFromAPI(Icon.dark)
    } : UriFromAPI(Icon) : void 0,
    accessibilityInformation: AccessibilityInformation
  };
}, "FromAPI");
const ToAPI = /* @__PURE__ */ __name((dto) => {
  const Label = dto.label.label;
  const Item = new ExtHostTypes.TreeItem(Label, dto.collapsibleState);
  Item.id = dto.id;
  Item.description = dto.description;
  if (dto.resourceUri) {
    Item.resourceUri = UriToAPI(dto.resourceUri);
  }
  return Item;
}, "ToAPI");
export {
  FromAPI,
  ToAPI
};
//# sourceMappingURL=Item.js.map
