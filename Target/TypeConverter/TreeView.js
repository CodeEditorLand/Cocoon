var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import * as MarkdownStringConverter from "./Main/MarkdownString.js";
import * as URIConverter from "./Main/URI.js";
var Option;
((Option2) => {
  function FromAPI(Option3) {
    return {
      showCollapseAll: !!Option3.showCollapseAll,
      canSelectMany: !!Option3.canSelectMany,
      hasHandleDrag: !!Option3.dragAndDropController?.handleDrag,
      hasHandleDrop: !!Option3.dragAndDropController?.handleDrop
    };
  }
  Option2.FromAPI = FromAPI;
  __name(FromAPI, "FromAPI");
})(Option || (Option = {}));
var Item;
((Item2) => {
  function FromAPI(Extension, Item3, Handle, ParentHandle, CommandConverter) {
    const {
      label,
      id,
      iconPath,
      resourceUri,
      tooltip,
      collapsibleState,
      contextValue,
      description,
      command,
      accessibilityInformation
    } = Item3;
    let themeIcon;
    let icon;
    if (iconPath instanceof ExtHostTypes.ThemeIcon) {
      themeIcon = { id: iconPath.id, color: iconPath.color?.id };
    } else {
      icon = iconPath;
    }
    return {
      handle: Handle,
      parentHandle: ParentHandle,
      label: typeof label === "string" ? { label } : label,
      id,
      description,
      resourceUri: resourceUri ? URIConverter.FromAPI(resourceUri) : void 0,
      tooltip: typeof tooltip === "string" ? tooltip : tooltip ? MarkdownStringConverter.FromAPI(tooltip) : void 0,
      command: command ? CommandConverter.ToInternal(command, []) : void 0,
      collapsibleState: collapsibleState ?? ExtHostTypes.TreeItemCollapsibleState.None,
      contextValue,
      themeIcon,
      icon: icon ? URIConverter.FromAPI(icon) : void 0,
      accessibilityInformation
    };
  }
  Item2.FromAPI = FromAPI;
  __name(FromAPI, "FromAPI");
  function ToAPI(DTO) {
    const label = DTO.label.label;
    const item = new ExtHostTypes.TreeItem(label, DTO.collapsibleState);
    item.id = DTO.id;
    item.description = DTO.description;
    item.resourceUri = DTO.resourceUri ? URIConverter.ToAPI(DTO.resourceUri) : void 0;
    return item;
  }
  Item2.ToAPI = ToAPI;
  __name(ToAPI, "ToAPI");
})(Item || (Item = {}));
export {
  Item,
  Option
};
//# sourceMappingURL=TreeView.js.map
