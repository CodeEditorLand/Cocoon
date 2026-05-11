var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/Window/CreateStatusBarItem.ts
var CreateStatusBarItem_default = /* @__PURE__ */ __name((Context, Handle, AlignmentOrId, Priority) => {
  const Item = {
    id: Handle,
    alignment: typeof AlignmentOrId === "number" ? AlignmentOrId : 1,
    priority: Priority,
    text: "",
    tooltip: "",
    command: void 0,
    show: /* @__PURE__ */ __name(() => {
      Context.SendToMountain("statusBar.update", {
        handle: Handle,
        text: Item.text,
        tooltip: Item.tooltip,
        command: Item.command,
        visible: true
      }).catch(() => {
      });
    }, "show"),
    hide: /* @__PURE__ */ __name(() => {
      Context.SendToMountain("statusBar.update", {
        handle: Handle,
        visible: false
      }).catch(() => {
      });
    }, "hide"),
    dispose: /* @__PURE__ */ __name(() => {
      Context.SendToMountain("statusBar.dispose", {
        handle: Handle
      }).catch(() => {
      });
    }, "dispose")
  };
  return Item;
}, "default");
export {
  CreateStatusBarItem_default as default
};
//# sourceMappingURL=CreateStatusBarItem.js.map
