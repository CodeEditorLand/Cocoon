var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Uri } from "../Type/ExtHostTypes.js";
var QuickPick;
((QuickPick2) => {
  QuickPick2.SerializeItems = /* @__PURE__ */ __name((Items) => Items.map((Item, Index) => {
    const Base = typeof Item === "string" ? { label: Item } : Item;
    return { ...Base, data: { _cocoonOriginalIndex: Index } };
  }), "SerializeItems");
  QuickPick2.SerializeButtons = /* @__PURE__ */ __name((Buttons) => Buttons?.map((Button, Index) => ({
    iconPath: Button.iconPath ? Uri.revive(Button.iconPath).toJSON() : void 0,
    tooltip: Button.tooltip,
    handle: Index
  })), "SerializeButtons");
})(QuickPick || (QuickPick = {}));
export {
  QuickPick
};
//# sourceMappingURL=QuickInput.js.map
