var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/Window/CreateStatusBarItem.ts
var StatusBarAlignment = /* @__PURE__ */ ((StatusBarAlignment2) => {
  StatusBarAlignment2[StatusBarAlignment2["Left"] = 1] = "Left";
  StatusBarAlignment2[StatusBarAlignment2["Right"] = 2] = "Right";
  return StatusBarAlignment2;
})(StatusBarAlignment || {});
var ResolveOverload = /* @__PURE__ */ __name((FirstArg, SecondArg, ThirdArg) => {
  if (typeof FirstArg === "string") {
    return {
      Id: FirstArg,
      Alignment: typeof SecondArg === "number" ? SecondArg : 1 /* Left */,
      Priority: typeof ThirdArg === "number" ? ThirdArg : void 0
    };
  }
  return {
    Id: void 0,
    Alignment: typeof FirstArg === "number" ? FirstArg : 1 /* Left */,
    Priority: typeof SecondArg === "number" ? SecondArg : void 0
  };
}, "ResolveOverload");
var CreateStatusBarItem_default = /* @__PURE__ */ __name((Context, Handle, AlignmentOrId, PriorityOrAlignment, Priority) => {
  const {
    Id,
    Alignment,
    Priority: ResolvedPriority
  } = ResolveOverload(AlignmentOrId, PriorityOrAlignment, Priority);
  let CurrentText = "";
  let CurrentTooltip = "";
  let CurrentCommand = void 0;
  let CurrentBackgroundColor = void 0;
  let CurrentColor = void 0;
  let CurrentVisible = false;
  let CurrentName = void 0;
  let CurrentAccessibility = void 0;
  let Disposed = false;
  const Push = /* @__PURE__ */ __name(() => {
    if (Disposed) return;
    if (!CurrentVisible) return;
    const NormalisedCommand = typeof CurrentCommand === "string" ? CurrentCommand : typeof CurrentCommand === "object" && CurrentCommand !== null ? {
      command: CurrentCommand.command,
      arguments: CurrentCommand.arguments,
      title: CurrentCommand.title,
      tooltip: CurrentCommand.tooltip
    } : void 0;
    Context.SendToMountain("statusBar.update", {
      handle: Handle,
      id: Id,
      alignment: Alignment,
      priority: ResolvedPriority,
      text: CurrentText,
      tooltip: CurrentTooltip,
      command: NormalisedCommand,
      backgroundColor: CurrentBackgroundColor,
      color: CurrentColor,
      visible: true,
      name: CurrentName,
      accessibilityInformation: CurrentAccessibility
    }).catch(() => {
    });
  }, "Push");
  const Item = {
    // `item.id` is read by extensions to disambiguate which item
    // fired their command. Upstream returns the `id` from the
    // `createStatusBarItem(id, ...)` overload, falling back to a
    // stable generated string. Use the explicit id when present;
    // otherwise the handle is the stable fallback.
    id: Id ?? String(Handle),
    alignment: Alignment,
    priority: ResolvedPriority,
    get text() {
      return CurrentText;
    },
    set text(Value) {
      if (Disposed) return;
      const Next = String(Value ?? "");
      if (Next === CurrentText) return;
      CurrentText = Next;
      Push();
    },
    get tooltip() {
      return CurrentTooltip;
    },
    set tooltip(Value) {
      if (Disposed) return;
      CurrentTooltip = Value;
      Push();
    },
    get command() {
      return CurrentCommand;
    },
    set command(Value) {
      if (Disposed) return;
      CurrentCommand = Value;
      Push();
    },
    get backgroundColor() {
      return CurrentBackgroundColor;
    },
    set backgroundColor(Value) {
      if (Disposed) return;
      CurrentBackgroundColor = Value;
      Push();
    },
    get color() {
      return CurrentColor;
    },
    set color(Value) {
      if (Disposed) return;
      CurrentColor = Value;
      Push();
    },
    get name() {
      return CurrentName;
    },
    set name(Value) {
      if (Disposed) return;
      CurrentName = typeof Value === "string" ? Value : void 0;
      Push();
    },
    get accessibilityInformation() {
      return CurrentAccessibility;
    },
    set accessibilityInformation(Value) {
      if (Disposed) return;
      CurrentAccessibility = Value;
      Push();
    },
    show: /* @__PURE__ */ __name(() => {
      if (Disposed) return;
      if (CurrentVisible) return;
      CurrentVisible = true;
      Push();
    }, "show"),
    hide: /* @__PURE__ */ __name(() => {
      if (Disposed) return;
      if (!CurrentVisible) return;
      CurrentVisible = false;
      Context.SendToMountain("statusBar.update", {
        handle: Handle,
        id: Id,
        visible: false
      }).catch(() => {
      });
    }, "hide"),
    // `dispose()` is idempotent in stock VS Code - calling it twice
    // is a no-op on the second pass. Previously a double-dispose
    // fired the Mountain notification twice and removed an item
    // that didn't exist on the second emit (logged as "warn").
    dispose: /* @__PURE__ */ __name(() => {
      if (Disposed) return;
      Disposed = true;
      CurrentVisible = false;
      Context.SendToMountain("statusBar.dispose", {
        handle: Handle,
        id: Id
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
