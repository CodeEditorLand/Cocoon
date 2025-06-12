var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IpcProvider } from "../Ipc/mod.js";
import { LogProvider } from "../Log.js";
import { AuthenticationProviderExistsError } from "./Error.js";
import { ConvertInfoToSession, ConvertSessionToInfo } from "./Type.js";
const Definition = Effect.gen(function* (_) {
  const Ipc = yield* _(IpcProvider.Tag);
  const Log = yield* _(LogProvider.Tag);
  const LocalProviders = yield* _(
    Ref.make(/* @__PURE__ */ new Map())
  );
  const OnDidChangeProviderEvent = CreateEventStream();
  const OnDidChangeSessionEvent = CreateEventStream();
  const $CreateSession = /* @__PURE__ */ __name((ProviderId, Scopes) => Effect.gen(function* (_2) {
    const provider = (yield* _2(Ref.get(LocalProviders))).get(
      ProviderId
    );
    if (!provider)
      throw new Error(
        `No auth provider with id '${ProviderId}' is registered.`
      );
    const session = yield* _2(
      Effect.tryPromise(() => provider.createSession(Scopes))
    );
    return ConvertSessionToInfo(session);
  }), "$CreateSession");
  const $RemoveSession = /* @__PURE__ */ __name((ProviderId, SessionId) => Effect.gen(function* (_2) {
    const provider = (yield* _2(Ref.get(LocalProviders))).get(
      ProviderId
    );
    if (!provider || !provider.removeSession) return;
    yield* _2(
      Effect.tryPromise(() => provider.removeSession(SessionId))
    );
  }), "$RemoveSession");
  Ipc.RegisterInvokeHandler(
    "$createSession",
    ([id, scopes]) => Effect.runPromise($CreateSession(id, scopes))
  );
  Ipc.RegisterInvokeHandler(
    "$removeSession",
    ([id, sid]) => Effect.runPromise($RemoveSession(id, sid))
  );
  const ServiceImplementation = {
    GetSession: /* @__PURE__ */ __name((ext, providerId, scopes, options) => Ipc.SendRequest("$getSession", [
      ext.id,
      providerId,
      scopes,
      options
    ]).pipe(
      Effect.map(
        (info) => info ? ConvertInfoToSession(info) : void 0
      ),
      Effect.tapError(
        (err) => Log.Error(
          `GetSession for provider '${providerId}' failed.`,
          err
        )
      )
    ), "GetSession"),
    ListSessions: /* @__PURE__ */ __name((ext, providerId, scopes) => Ipc.SendRequest("$getSessions", [
      ext.id,
      providerId,
      scopes
    ]).pipe(
      Effect.map((infos) => infos.map(ConvertInfoToSession)),
      Effect.tapError(
        (err) => Log.Error(
          `ListSessions for provider '${providerId}' failed.`,
          err
        )
      ),
      Effect.catchAll(() => Effect.succeed([]))
      // Return empty array on failure
    ), "ListSessions"),
    RegisterAuthenticationProvider: /* @__PURE__ */ __name((Id, Label, Provider, Options) => Effect.gen(function* (_2) {
      const providers = yield* _2(Ref.get(LocalProviders));
      if (providers.has(Id)) {
        return yield* _2(
          Effect.fail(
            new AuthenticationProviderExistsError({
              providerId: Id
            })
          )
        );
      }
      yield* _2(
        Ref.update(LocalProviders, (map) => map.set(Id, Provider))
      );
      yield* _2(
        Ipc.SendNotification("$registerAuthenticationProvider", [
          Id,
          Label,
          !!Options?.supportsMultipleAccounts
        ])
      );
      const disposable = {
        dispose: /* @__PURE__ */ __name(() => {
          Effect.runFork(
            Ref.update(
              LocalProviders,
              (map) => (map.delete(Id), map)
            ).pipe(
              Effect.flatMap(
                () => Ipc.SendNotification(
                  "$unregisterAuthenticationProvider",
                  [Id]
                )
              )
            )
          );
        }, "dispose")
      };
      return disposable;
    }), "RegisterAuthenticationProvider"),
    OnDidChangeAuthenticationProvider: OnDidChangeProviderEvent.Stream,
    OnDidChangeSession: OnDidChangeSessionEvent.Stream
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
