var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { URI } from "../Type/ExtHostTypes.js";
var QuickPick;
((QuickPick2) => {
  function SerializeItems(Items) {
    return Items.map((Item, Index) => {
      const Base = typeof Item === "string" ? { label: Item } : Item;
      return { ...Base, handle: Index };
    });
  }
  QuickPick2.SerializeItems = SerializeItems;
  __name(SerializeItems, "SerializeItems");
  function SerializeButtons(Buttons) {
    return Buttons?.map((Button, Index) => ({
      iconPath: Button.iconPath ? {
        dark: URI.revive(
          Button.iconPath.dark
        ).toJSON(),
        light: URI.revive(
          Button.iconPath.light
        ).toJSON()
      } : void 0,
      tooltip: Button.tooltip,
      handle: Index
    }));
  }
  QuickPick2.SerializeButtons = SerializeButtons;
  __name(SerializeButtons, "SerializeButtons");
})(QuickPick || (QuickPick = {}));
export {
  QuickPick
};
//# sourceMappingURL=QuickInput.js.map
