var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { URI } from "vscode";
const QuickPick = {
  /**
   * Serializes `QuickPickItem` or string arrays for IPC transport.
   * It attaches a temporary index to map results back to the original objects.
   * @param Items The array of items to serialize.
   * @returns A serializable representation of the items.
   */
  SerializeItems: /* @__PURE__ */ __name((Items) => {
    return Items.map((Item, Index) => {
      const Base = typeof Item === "string" ? { label: Item } : Item;
      return { ...Base, handle: Index };
    });
  }, "SerializeItems"),
  /**
   * Serializes `QuickInputButton` arrays for IPC transport.
   * @param Buttons The array of buttons to serialize.
   * @returns A serializable representation of the buttons.
   */
  SerializeButtons: /* @__PURE__ */ __name((Buttons) => {
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
  }, "SerializeButtons")
};
var QuickInput_default = { QuickPick };
export {
  QuickInput_default as default
};
//# sourceMappingURL=QuickInput.js.map
