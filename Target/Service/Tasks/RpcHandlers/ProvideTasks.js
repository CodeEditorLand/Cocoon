var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import * as TypeConverter from "../../../TypeConverter/mod.js";
const ProvideTasks = /* @__PURE__ */ __name((Registry, Handle) => Effect.gen(function* (_) {
  const Entry = (yield* _(Registry)).get(Handle);
  if (!Entry)
    throw new Error(`Task provider with handle ${Handle} not found.`);
  const Provider = Entry.provider;
  if (!Provider.provideTasks) return [];
  const Tasks = yield* _(
    Effect.tryPromise(() => Provider.provideTasks({}))
  );
  if (!Tasks) return [];
  return Tasks.map(
    (task) => TypeConverter.Task.fromApi(task, Entry.extension)
  );
}).pipe(Effect.catchAll(() => Effect.succeed([]))), "ProvideTasks");
export {
  ProvideTasks
};
//# sourceMappingURL=ProvideTasks.js.map
