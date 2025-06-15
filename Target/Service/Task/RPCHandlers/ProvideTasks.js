var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { Task as TaskConverter } from "../../../TypeConverter.js";
import CancellationService from "../../Cancellation/Service.js";
const ProvideTasks = /* @__PURE__ */ __name((Registry, Handle, TokenID) => {
  return Effect.gen(function* () {
    const Entry = (yield* Registry).get(Handle);
    if (!Entry) {
      return yield* Effect.fail(
        new Error(`Task provider with handle ${Handle} not found.`)
      );
    }
    const Provider = Entry.provider;
    if (!Provider.provideTasks) {
      return [];
    }
    const Cancellation = yield* CancellationService;
    const { Token } = yield* Cancellation.ObtainToken(TokenID);
    const Tasks = yield* Effect.tryPromise({
      try: /* @__PURE__ */ __name(() => Provider.provideTasks(Token), "try"),
      catch: /* @__PURE__ */ __name((CaughtError) => CaughtError, "catch")
    });
    if (!Tasks) {
      return [];
    }
    return Tasks.map(
      (Task) => TaskConverter.FromAPI(Task, Entry.extension)
    );
  }).pipe(
    Effect.scoped,
    // Ensures cancellation token scope is handled
    Effect.catchAll(() => Effect.succeed([]))
    // On error, return an empty array
  );
}, "ProvideTasks");
var ProvideTasks_default = ProvideTasks;
export {
  ProvideTasks_default as default
};
//# sourceMappingURL=ProvideTasks.js.map
