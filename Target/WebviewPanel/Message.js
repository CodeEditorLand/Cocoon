var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/WebviewPanel/Message.ts
import { Effect } from "effect";
var MessageService = class extends Effect.Service()(
  "Message/WebviewPanel",
  {
    effect: Effect.gen(function* () {
      const HandlersRef = yield* Effect.tryMap(
        Effect.sync(() => /* @__PURE__ */ new Map()),
        (error) => new Error(`Failed to create handlers map: ${error}`)
      );
      const ValidateMessage = /* @__PURE__ */ __name((Message) => Effect.gen(function* () {
        if (typeof Message !== "object" || Message === null || Array.isArray(Message)) {
          return yield* Effect.fail(
            new Error("Message must be an object")
          );
        }
        const Msg = Message;
        if (typeof Msg.Type !== "string") {
          return yield* Effect.fail(
            new Error("Message missing Type")
          );
        }
        if (typeof Msg.Payload !== "object" || Msg.Payload === null) {
          return yield* Effect.fail(
            new Error("Message missing Payload")
          );
        }
        if (typeof Msg.Timestamp !== "number") {
          return yield* Effect.fail(
            new Error("Message missing Timestamp")
          );
        }
        if (typeof Msg.Id !== "string") {
          return yield* Effect.fail(
            new Error("Message missing Id")
          );
        }
        if (Msg.Type === "Request") {
          const Payload = Msg.Payload;
          if (typeof Payload.Method !== "string" || !Array.isArray(payload.Parameters)) {
            return yield* Effect.fail(
              new Error(
                "Request message has invalid payload"
              )
            );
          }
        } else if (Msg.Type === "Response") {
          const Payload = Msg.Payload;
          if (typeof Payload.Success !== "boolean") {
            return yield* Effect.fail(
              new Error(
                "Response message has invalid payload"
              )
            );
          }
        } else if (Msg.Type === "Event") {
          const EventPayload = Msg.Payload;
          if (typeof EventPayload.EventName !== "string") {
            return yield* Effect.fail(
              new Error("Event message has invalid payload")
            );
          }
        } else {
          return yield* Effect.fail(
            new Error(`Unknown message type: ${Msg.Type}`)
          );
        }
        return Msg;
      }), "ValidateMessage");
      const CreateMessage = /* @__PURE__ */ __name((Type, Payload) => ({
        Type,
        Payload,
        Timestamp: Date.now(),
        Id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`
      }), "CreateMessage");
      const SendMessage = /* @__PURE__ */ __name((Webview, Message) => Effect.tryPromise({
        try: /* @__PURE__ */ __name(() => Webview.postMessage(Message), "try"),
        catch: /* @__PURE__ */ __name(() => false, "catch")
      }), "SendMessage");
      const RegisterHandler = /* @__PURE__ */ __name((Type, Handler) => Effect.sync(() => {
        HandlersRef.current.set(Type, Handler);
      }), "RegisterHandler");
      const UnregisterHandler = /* @__PURE__ */ __name((Type) => Effect.sync(() => {
        HandlersRef.current.delete(Type);
      }), "UnregisterHandler");
      const RouteMessage = /* @__PURE__ */ __name((Message) => Effect.gen(function* () {
        const Handlers = HandlersRef.current;
        const Handler = Handlers.get(Message.Type);
        if (!Handler) {
          return yield* Effect.fail(
            new Error(
              `No handler registered for type: ${Message.Type}`
            )
          );
        }
        yield* Handler(Message);
      }), "RouteMessage");
      const Handle = /* @__PURE__ */ __name((Message) => Effect.gen(function* () {
        const ValidatedMessage = yield* ValidateMessage(Message);
        yield* RouteMessage(ValidatedMessage);
      }), "Handle");
      return {
        CreateMessage,
        SendMessage,
        RegisterHandler,
        UnregisterHandler,
        Handle
      };
    })
  }
) {
  static {
    __name(this, "MessageService");
  }
};
export {
  MessageService
};
//# sourceMappingURL=Message.js.map
