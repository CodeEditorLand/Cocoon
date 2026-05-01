var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Window/StatusBar.ts
import { Effect } from "effect";
var CreateStatusBarItem = /* @__PURE__ */ __name((MountainClient, GRPCClient, Logger, Id, Alignment, Priority) => Effect.gen(function* () {
  const ItemId = Id ?? `statusbar-${crypto.randomUUID()}`;
  yield* Logger.Info(
    `[WindowService] Creating status bar item with id '${ItemId}'`
  );
  const State = {
    id: ItemId,
    name: void 0,
    text: "",
    tooltip: void 0,
    command: void 0,
    alignment: Alignment ?? 1,
    // Left = 1
    priority: Priority,
    backgroundColor: void 0,
    color: void 0,
    isVisible: false
  };
  yield* GRPCClient.createStatusBarItem({
    id: ItemId,
    text: "",
    tooltip: void 0
  });
  return yield* Effect.succeed({
    get id() {
      return State.id;
    },
    get name() {
      return State.name;
    },
    set name(Value) {
      State.name = Value;
    },
    get alignment() {
      return State.alignment;
    },
    get priority() {
      return State.priority;
    },
    get text() {
      return State.text;
    },
    set text(Value) {
      State.text = Value;
      MountainClient.sendNotification("setStatusBarText", {
        itemId: ItemId,
        text: Value
      }).catch(() => {
      });
    },
    get tooltip() {
      return State.tooltip;
    },
    set tooltip(Value) {
      State.tooltip = Value;
    },
    get command() {
      return State.command;
    },
    set command(Value) {
      State.command = Value;
    },
    get backgroundColor() {
      return State.backgroundColor;
    },
    set backgroundColor(Value) {
      State.backgroundColor = Value;
    },
    get color() {
      return State.color;
    },
    set color(Value) {
      State.color = Value;
    },
    show() {
      State.isVisible = true;
      MountainClient.sendNotification("setStatusBarText", {
        itemId: ItemId,
        text: State.text,
        visible: true
      }).catch(() => {
      });
    },
    hide() {
      State.isVisible = false;
      MountainClient.sendNotification("setStatusBarText", {
        itemId: ItemId,
        text: State.text,
        visible: false
      }).catch(() => {
      });
    },
    dispose() {
      State.isVisible = false;
      MountainClient.sendNotification("disposeStatusBarItem", {
        itemId: ItemId
      }).catch(() => {
      });
    },
    accessibilityInformation: void 0
  });
}), "CreateStatusBarItem");
export {
  CreateStatusBarItem
};
//# sourceMappingURL=StatusBar.js.map
