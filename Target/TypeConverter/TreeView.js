var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import {
  MarkdownString as MarkdownStringConverter,
  URI as URIConverter
} from "./Main.js";
const Option = {
  FromAPI: /* @__PURE__ */ __name((Option2) => {
    return {
      showCollapseAll: !!Option2.showCollapseAll,
      canSelectMany: !!Option2.canSelectMany,
      hasHandleDrag: !!Option2.dragAndDropController?.handleDrag,
      hasHandleDrop: !!Option2.dragAndDropController?.handleDrop
    };
  }, "FromAPI")
};
const Item = {
  FromAPI: /* @__PURE__ */ __name((_Extension, Item2, Handle, ParentHandle, CommandConverter) => {
    const {
      label: Label,
      id: ID,
      iconPath: IconPath,
      resourceUri: ResourceURI,
      tooltip: Tooltip,
      collapsibleState: CollapsibleState,
      contextValue: ContextValue,
      description: Description,
      command: Command,
      accessibilityInformation: AccessibilityInformation
    } = Item2;
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
      handle: Handle,
      parentHandle: ParentHandle,
      label: typeof Label === "string" ? { label: Label } : Label,
      id: ID,
      description: Description,
      resourceUri: ResourceURI ? URIConverter.FromAPI(ResourceURI) : void 0,
      tooltip: typeof Tooltip === "string" ? Tooltip : Tooltip ? MarkdownStringConverter.FromAPI(Tooltip) : void 0,
      command: Command ? CommandConverter.ToInternal(Command, []) : void 0,
      collapsibleState: CollapsibleState ?? ExtHostTypes.TreeItemCollapsibleState.None,
      contextValue: ContextValue,
      themeIcon: ThemeIcon,
      icon: Icon ? "light" in Icon && "dark" in Icon ? {
        light: URIConverter.FromAPI(Icon.light),
        dark: URIConverter.FromAPI(Icon.dark)
      } : URIConverter.FromAPI(Icon) : void 0,
      accessibilityInformation: AccessibilityInformation
    };
  }, "FromAPI"),
  ToAPI: /* @__PURE__ */ __name((DTO) => {
    const Label = DTO.label.label;
    const Item2 = new ExtHostTypes.TreeItem(Label, DTO.collapsibleState);
    Item2.id = DTO.id;
    Item2.description = DTO.description;
    Item2.resourceURI = DTO.resourceUri ? URIConverter.ToAPI(DTO.resourceUri) : void 0;
    return Item2;
  }, "ToAPI")
};
var TreeView_default = { Option, Item };
export {
  TreeView_default as default
};
//# sourceMappingURL=TreeView.js.map
