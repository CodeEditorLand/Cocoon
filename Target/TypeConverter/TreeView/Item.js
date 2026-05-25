var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));

// Source/Platform/VSCode/Type.ts
var Type_exports = {};
__export(Type_exports, {
  CancellationToken: () => CancellationToken,
  CancellationTokenSource: () => CancellationTokenSource,
  URI: () => URI
});
__reExport(Type_exports, extHostTypes_star);
import * as extHostTypes_star from "@codeeditorland/output/Target/Microsoft/VSCode/vs/workbench/api/common/extHostTypes.js";
import { URI } from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/uri.js";
import {
  CancellationToken,
  CancellationTokenSource
} from "@codeeditorland/output/Target/Microsoft/VSCode/vs/base/common/cancellation.js";

// Source/TypeConverter/Main/Markdown/String.ts
var FromAPI = /* @__PURE__ */ __name((MarkdownStringInstance) => ({
  value: MarkdownStringInstance.value,
  // FIX: Handle exactOptionalPropertyTypes
  ...MarkdownStringInstance.isTrusted && {
    isTrusted: MarkdownStringInstance.isTrusted
  },
  ...MarkdownStringInstance.baseUri && {
    baseUri: MarkdownStringInstance.baseUri
  },
  ...MarkdownStringInstance.supportHtml && {
    supportHtml: MarkdownStringInstance.supportHtml
  }
}), "FromAPI");
var ToAPI = /* @__PURE__ */ __name((MarkdownStringDTO) => {
  const result = new Type_exports.MarkdownString(
    MarkdownStringDTO.value,
    typeof MarkdownStringDTO.isTrusted === "boolean" ? MarkdownStringDTO.isTrusted : !!MarkdownStringDTO.isTrusted
  );
  if (MarkdownStringDTO.baseUri) {
    result.baseUri = MarkdownStringDTO.baseUri;
  }
  if (MarkdownStringDTO.supportHtml) {
    result.supportHtml = MarkdownStringDTO.supportHtml;
  }
  return result;
}, "ToAPI");

// Source/TypeConverter/Main/URI.ts
var FromAPI2 = /* @__PURE__ */ __name((TheURI) => TheURI.toJSON(), "FromAPI");
var ToAPI2 = /* @__PURE__ */ __name((DTO) => URI.revive(DTO), "ToAPI");

// Source/TypeConverter/TreeView/Item.ts
var { TreeItemCollapsibleState } = Type_exports;
var FromAPI3 = /* @__PURE__ */ __name((_extension, item, handle, parentHandle, commandConverter) => {
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
  let ThemeIcon2;
  let Icon;
  if (IconPath instanceof Type_exports.ThemeIcon) {
    ThemeIcon2 = {
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
    resourceUri: ResourceUri ? FromAPI2(ResourceUri) : void 0,
    tooltip: typeof Tooltip === "string" ? Tooltip : Tooltip instanceof Type_exports.MarkdownString ? FromAPI(Tooltip) : void 0,
    command: Command ? commandConverter.ToInternal(Command, []) : void 0,
    collapsibleState: CollapsibleStateValue ?? TreeItemCollapsibleState.None,
    contextValue: ContextValue,
    themeIcon: ThemeIcon2,
    icon: Icon ? "light" in Icon && "dark" in Icon ? {
      light: FromAPI2(Icon.light),
      dark: FromAPI2(Icon.dark)
    } : FromAPI2(Icon) : void 0,
    accessibilityInformation: AccessibilityInformation
  };
}, "FromAPI");
var ToAPI3 = /* @__PURE__ */ __name((dto) => {
  const Label = dto.label.label;
  const Item = new Type_exports.TreeItem(Label, dto.collapsibleState);
  Item.id = dto.id;
  Item.description = dto.description;
  if (dto.resourceUri) {
    Item.resourceUri = ToAPI2(dto.resourceUri);
  }
  return Item;
}, "ToAPI");
export {
  FromAPI3 as FromAPI,
  ToAPI3 as ToAPI
};
//# sourceMappingURL=Item.js.map
