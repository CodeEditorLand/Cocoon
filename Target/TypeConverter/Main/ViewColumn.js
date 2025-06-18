var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { ViewColumn as VscViewColumn } from "vs/workbench/api/common/extHostTypes.js";
const ActiveEditorGroup = -1;
const SIDE_GROUP = -2;
const FromAPI = /* @__PURE__ */ __name((ViewColumn) => {
  if (typeof ViewColumn !== "number") {
    return void 0;
  }
  switch (ViewColumn) {
    case VscViewColumn.Active:
      return ActiveEditorGroup;
    case VscViewColumn.Beside:
      return SIDE_GROUP;
    default:
      if (ViewColumn >= VscViewColumn.One) {
        return ViewColumn - 1;
      }
  }
  return void 0;
}, "FromAPI");
var ViewColumn_default = { FromAPI };
export {
  ViewColumn_default as default
};
//# sourceMappingURL=ViewColumn.js.map
