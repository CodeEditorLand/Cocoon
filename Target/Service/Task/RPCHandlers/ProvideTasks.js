var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import * as TypeConverter from "../../../TypeConverter.js";
import { Cancellation } from "../../Cancellation/Service.js";
function ProvideTasks(Registry, Handle, TokenID) {
  return Effect.gen(function* (_) {
    const Entry = (yield* _(Registry)).get(Handle);
    if (!Entry) {
      return yield* _(
        Effect.fail(
          new Error(`Task provider with handle ${Handle} not found.`)
        )
      );
    }
    const Provider = Entry.provider;
    if (!Provider.provideTasks) {
      return [];
    }
    const CancellationService = yield* _(Cancellation.Tag);
    const { Token } = yield* _(CancellationService.ObtainToken(TokenID));
    const Tasks = yield* _(
      Effect.tryPromise(() => Provider.provideTasks(Token))
    );
    if (!Tasks) {
      return [];
    }
    return Tasks.map(
      (task) => TypeConverter.Task.fromAPI(task, Entry.extension)
    );
  }).pipe(
    Effect.scoped,
    // Ensures cancellation token scope is handled
    Effect.catchAll(() => Effect.succeed([]))
    // On error, return an empty array
  );
}
__name(ProvideTasks, "ProvideTasks");
export {
  ProvideTasks
};
//# sourceMappingURL=ProvideTasks.js.map
