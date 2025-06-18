var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { Task as TaskConverter } from "../../../TypeConverter/Task.js";
const ProvideTasksEffect = /* @__PURE__ */ __name((Registry, Handle, TokenID, Cancellation) => {
  return Effect.gen(function* (G) {
    const Entry = (yield* G(Ref.get(Registry))).get(Handle);
    if (!Entry) {
      return yield* G(
        Effect.fail(
          new Error(`Task provider with handle ${Handle} not found.`)
        )
      );
    }
    const Provider = Entry.Provider;
    if (!Provider.provideTasks) {
      return [];
    }
    const Token = yield* G(Cancellation.ObtainToken(TokenID));
    const Tasks = yield* G(
      Effect.tryPromise({
        try: /* @__PURE__ */ __name(() => Provider.provideTasks(Token), "try"),
        catch: /* @__PURE__ */ __name((CaughtError) => CaughtError, "catch")
      })
    );
    if (!Tasks) {
      return [];
    }
    return Tasks.map(
      (Task) => TaskConverter.FromAPI(Task, Entry.Extension)
    );
  }).pipe(
    Effect.scoped,
    Effect.catchAll(() => Effect.succeed([]))
  );
}, "ProvideTasksEffect");
var ProvideTasks_default = ProvideTasksEffect;
export {
  ProvideTasks_default as default
};
//# sourceMappingURL=ProvideTasks.js.map
