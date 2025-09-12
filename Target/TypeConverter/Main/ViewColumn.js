var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { ViewColumn as VSCodeViewColumn } from "vscode";
const ActiveEditorGroup = -1;
const SideGroup = -2;
const FromAPI = /* @__PURE__ */ __name((ViewColumn) => {
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
export {
  FromAPI
};
//# sourceMappingURL=ViewColumn.js.map
