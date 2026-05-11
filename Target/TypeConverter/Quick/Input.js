var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/TypeConverter/Quick/Input.ts
var SerializeItems = /* @__PURE__ */ __name((Items) => {
  return Items.map((Item, Index) => {
    const Base = typeof Item === "string" ? { label: Item } : Item;
    return { ...Base, handle: Index };
  });
}, "SerializeItems");
var SerializeButtons = /* @__PURE__ */ __name((Buttons) => {
  return Buttons?.map((Button, Index) => {
    const iconPath = Button.iconPath;
    return {
      iconPath: iconPath ? "dark" in iconPath && "light" in iconPath ? {
        dark: iconPath.dark.toJSON(),
        light: iconPath.light.toJSON()
      } : iconPath.toJSON() : void 0,
      tooltip: Button.tooltip,
      handle: Index
    };
  });
}, "SerializeButtons");
export {
  SerializeButtons,
  SerializeItems
};
//# sourceMappingURL=Input.js.map
