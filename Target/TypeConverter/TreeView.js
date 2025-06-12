var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import * as ExtHostTypes from "../Type/ExtHostTypes.js";
import {
  MarkdownString as MarkdownStringConverter,
  Uri as UriConverter
} from "./Main.js";
var Options;
((Options2) => {
  Options2.fromApi = /* @__PURE__ */ __name((options) => ({
    ShowCollapseAll: !!options.showCollapseAll,
    CanSelectMany: !!options.canSelectMany,
    HasHandleDrag: !!options.dragAndDropController?.handleDrag,
    HasHandleDrop: !!options.dragAndDropController?.handleDrop
  }), "fromApi");
})(Options || (Options = {}));
var Item;
((Item2) => {
  Item2.fromApi = /* @__PURE__ */ __name((Extension, Item3, Handle, ParentHandle, CommandConverter) => {
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
    if (iconPath instanceof ExtHostTypes.ThemeIcon) {
      themeIcon = { id: iconPath.id, color: iconPath.color?.id };
    }
    return {
      Handle,
      ParentHandle,
      Label: typeof label === "string" ? { label } : label,
      Id: id,
      Description: description,
      ResourceUri: resourceUri ? UriConverter.fromApi(resourceUri) : void 0,
      Tooltip: typeof tooltip === "string" ? tooltip : tooltip ? MarkdownStringConverter.fromApi(tooltip) : void 0,
      Command: command ? CommandConverter.ToInternal(command, []) : void 0,
      CollapsibleState: collapsibleState ?? ExtHostTypes.TreeItemCollapsibleState.None,
      ContextValue: contextValue,
      ThemeIcon: themeIcon,
      AccessibilityInformation: accessibilityInformation
      // The iconPath is more complex to serialize if it's a light/dark Uri pair.
      // A full implementation would handle this.
    };
  }, "fromApi");
  Item2.toApi = /* @__PURE__ */ __name((dto) => {
    const label = dto.Label.label;
    const item = new ExtHostTypes.TreeItem(label, dto.CollapsibleState);
    item.id = dto.Id;
    item.description = dto.Description;
    item.resourceUri = dto.ResourceUri ? UriConverter.toApi(dto.ResourceUri) : void 0;
    return item;
  }, "toApi");
})(Item || (Item = {}));
export {
  Item,
  Options
};
//# sourceMappingURL=TreeView.js.map
