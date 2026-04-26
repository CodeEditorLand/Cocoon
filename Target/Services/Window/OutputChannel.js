var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Window/OutputChannel.ts
import { Effect } from "effect";
var CreateOutputChannel = /* @__PURE__ */ __name((MountainClient, Logger, Name) => Effect.gen(function* () {
  const ChannelId = `output-${crypto.randomUUID()}`;
  yield* Logger.Info(
    `[WindowService] Creating output channel: ${Name} (${ChannelId})`
  );
  yield* Effect.tryPromise({
    try: /* @__PURE__ */ __name(() => MountainClient.sendNotification("output.create", {
      id: ChannelId,
      name: Name
    }), "try"),
    catch: /* @__PURE__ */ __name(() => new Error("Failed to create output channel"), "catch")
  });
  return yield* Effect.succeed({
    name: Name,
    append(Value) {
      MountainClient.sendNotification("output.append", {
        channel: ChannelId,
        value: Value
      }).catch(() => {
      });
    },
    appendLine(Value) {
      MountainClient.sendNotification("output.appendLine", {
        channel: ChannelId,
        value: Value
      }).catch(() => {
      });
    },
    clear() {
      MountainClient.sendNotification("output.clear", {
        channel: ChannelId
      }).catch(() => {
      });
    },
    show(_ColumnOrPreserveFocus, _PreserveFocus) {
      MountainClient.sendNotification("output.show", {
        channel: ChannelId
      }).catch(() => {
      });
    },
    hide() {
      MountainClient.sendNotification("output.show", {
        channel: ChannelId,
        visible: false
      }).catch(() => {
      });
    },
    dispose() {
      MountainClient.sendNotification("output.dispose", {
        channel: ChannelId
      }).catch(() => {
      });
    },
    replace(_Value) {
      MountainClient.sendNotification("output.replace", {
        channel: ChannelId,
        value: _Value
      }).catch(() => {
      });
    }
  });
}), "CreateOutputChannel");
export {
  CreateOutputChannel
};
//# sourceMappingURL=OutputChannel.js.map
