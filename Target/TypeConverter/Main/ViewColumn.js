var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import {
  ActiveEditorGroup,
  SIDE_GROUP
} from "vs/workbench/services/editor/common/editorService.js";
import { ViewColumn as VscViewColumn } from "../../Type/ExtHostTypes.js";
function FromAPI(ViewColumn) {
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
}
__name(FromAPI, "FromAPI");
export {
  FromAPI
};
//# sourceMappingURL=ViewColumn.js.map
