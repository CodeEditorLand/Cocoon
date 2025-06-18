var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { TreeItemCollapsibleState } from "vscode";
import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import MarkdownStringConverter from "./Main/MarkdownString.js";
import URIConverter from "./Main/URI.js";
const Option = {
  FromAPI: /* @__PURE__ */ __name((option) => {
    return {
      showCollapseAll: !!option.showCollapseAll,
      canSelectMany: !!option.canSelectMany,
      hasHandleDrag: !!option.dragAndDropController?.handleDrag,
      hasHandleDrop: !!option.dragAndDropController?.handleDrop
    };
  }, "FromAPI")
};
const Item = {
  FromAPI: /* @__PURE__ */ __name((_extension, item, handle, parentHandle, commandConverter) => {
    const {
      label: Label,
      id: ID,
      iconPath: IconPath,
      resourceUri: ResourceURI,
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
      id: ID,
      description: Description,
      resourceUri: ResourceURI ? URIConverter.FromAPI(ResourceURI) : void 0,
      tooltip: typeof Tooltip === "string" ? Tooltip : Tooltip instanceof ExtHostTypes.MarkdownString ? MarkdownStringConverter.FromAPI(Tooltip) : void 0,
      command: Command ? commandConverter.ToInternal(Command, []) : void 0,
      collapsibleState: CollapsibleStateValue ?? TreeItemCollapsibleState.None,
      contextValue: ContextValue,
      themeIcon: ThemeIcon,
      icon: Icon ? "light" in Icon && "dark" in Icon ? {
        light: URIConverter.FromAPI(Icon.light),
        dark: URIConverter.FromAPI(Icon.dark)
      } : URIConverter.FromAPI(Icon) : void 0,
      accessibilityInformation: AccessibilityInformation
    };
  }, "FromAPI"),
  ToAPI: /* @__PURE__ */ __name((dto) => {
    const Label = dto.label.label;
    const Item2 = new ExtHostTypes.TreeItem(Label, dto.collapsibleState);
    Item2.id = dto.id;
    Item2.description = dto.description;
    Item2.resourceURI = dto.resourceUri ? URIConverter.ToAPI(dto.resourceUri) : void 0;
    return Item2;
  }, "ToAPI")
};
const TreeView = { Option, Item };
export {
  TreeView
};
//# sourceMappingURL=TreeView.js.map
