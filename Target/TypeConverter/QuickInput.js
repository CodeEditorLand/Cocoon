var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Uri } from "vscode";
var QuickInput_default = {
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
    return Buttons?.map((Button, Index) => {
      const iconPath = Button.iconPath;
      return {
        // FIX: `Uri.revive` does not exist on the public API.
        // The DTO should be built from the raw URI data.
        // Assuming the `iconPath` in the DTO is a string or has `dark`/`light` string properties.
        iconPath: iconPath ? "dark" in iconPath && "light" in iconPath ? {
          dark: Uri.parse(iconPath.dark).toJSON(),
          light: Uri.parse(iconPath.light).toJSON()
        } : Uri.parse(iconPath.toString()).toJSON() : void 0,
        tooltip: Button.tooltip,
        handle: Index
      };
    });
  }, "SerializeButtons")
};
export {
  QuickInput_default as default
};
//# sourceMappingURL=QuickInput.js.map
