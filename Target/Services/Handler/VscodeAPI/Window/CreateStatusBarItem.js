var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/Window/CreateStatusBarItem.ts
var CreateStatusBarItem_default = /* @__PURE__ */ __name((Context, Handle, AlignmentOrId, Priority) => {
  let _text = "";
  let _tooltip = "";
  let _command = void 0;
  let _backgroundColor = void 0;
  let _color = void 0;
  let _visible = false;
  let _name = void 0;
  const Push = /* @__PURE__ */ __name(() => {
    if (!_visible) return;
    Context.SendToMountain("statusBar.update", {
      handle: Handle,
      text: _text,
      tooltip: _tooltip,
      command: typeof _command === "string" ? _command : _command?.command,
      backgroundColor: _backgroundColor,
      color: _color,
      visible: true,
      name: _name
    }).catch(() => {
    });
  }, "Push");
  const Item = {
    id: Handle,
    alignment: typeof AlignmentOrId === "number" ? AlignmentOrId : typeof AlignmentOrId === "object" ? 1 : 1,
    priority: Priority,
    name: _name,
    get text() {
      return _text;
    },
    set text(V) {
      _text = String(V ?? "");
      Push();
    },
    get tooltip() {
      return _tooltip;
    },
    set tooltip(V) {
      _tooltip = V;
      Push();
    },
    get command() {
      return _command;
    },
    set command(V) {
      _command = V;
      Push();
    },
    get backgroundColor() {
      return _backgroundColor;
    },
    set backgroundColor(V) {
      _backgroundColor = V;
      Push();
    },
    get color() {
      return _color;
    },
    set color(V) {
      _color = V;
      Push();
    },
    get accessibilityInformation() {
      return void 0;
    },
    set accessibilityInformation(_V) {
    },
    show: /* @__PURE__ */ __name(() => {
      _visible = true;
      Push();
    }, "show"),
    hide: /* @__PURE__ */ __name(() => {
      _visible = false;
      Context.SendToMountain("statusBar.update", {
        handle: Handle,
        visible: false
      }).catch(() => {
      });
    }, "hide"),
    dispose: /* @__PURE__ */ __name(() => {
      _visible = false;
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
