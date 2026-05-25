var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/TypeConverter/Main/View/Column.ts
var { ViewColumn: VSCodeViewColumn } = await import("@codeeditorland/output/Target/Microsoft/VSCode/vs/workbench/api/common/extHostTypes.js");
var ActiveEditorGroup = -1;
var SideGroup = -2;
var FromAPI = /* @__PURE__ */ __name((ViewColumn) => {
  if (typeof ViewColumn !== "number") {
    return void 0;
  }
  switch (ViewColumn) {
    case VSCodeViewColumn.Active:
      return ActiveEditorGroup;
    case VSCodeViewColumn.Beside:
      return SideGroup;
    default:
      if (ViewColumn >= VSCodeViewColumn.One) {
        return ViewColumn - 1;
      }
  }
  return void 0;
}, "FromAPI");

// Source/TypeConverter/Webview/Convert/Show/Option/To/DTO.ts
var ConvertShowOptionToDTO = /* @__PURE__ */ __name((ViewColumn, PreserveFocus) => {
  const DTO = {
    preserveFocus: PreserveFocus
  };
  const ViewColumnValue = FromAPI(ViewColumn);
  if (ViewColumnValue !== void 0) {
    DTO.viewColumn = ViewColumnValue;
  }
  return DTO;
}, "ConvertShowOptionToDTO");
export {
  ConvertShowOptionToDTO
};
//# sourceMappingURL=DTO.js.map
