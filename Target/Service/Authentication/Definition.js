var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref, Stream } from "effect";
import { CreateEventStream } from "../../Utility/CreateEventStream.js";
import { IPC } from "../IPC.js";
import { Log } from "../Log.js";
import { AuthenticationProviderExistsError } from "./Error.js";
import { ConvertSessionToInternal, ConvertSessionToVSCode } from "./Type.js";
const Definition = Effect.gen(function* (_) {
  const IPCService = yield* _(IPC.Tag);
  const LogService = yield* _(Log.Tag);
  const LocalProviders = yield* _(
    Ref.make(/* @__PURE__ */ new Map())
  );
  const OnDidChangeProvidersEvent = CreateEventStream();
  const OnDidChangeSessionsEvent = CreateEventStream();
  const CreateSession = /* @__PURE__ */ __name((ProviderID, Scopes) => Effect.gen(function* (_2) {
    const provider = (yield* _2(Ref.get(LocalProviders))).get(
      ProviderID
    );
    if (!provider) {
      return yield* _2(
        Effect.fail(
          new Error(
            `No auth provider with id '${ProviderID}' is registered.`
          )
        )
      );
    }
    const session = yield* _2(
      Effect.tryPromise(() => provider.createSession(Scopes))
    );
    return ConvertSessionToInternal(session);
  }), "CreateSession");
  const RemoveSession = /* @__PURE__ */ __name((ProviderID, SessionID) => Effect.gen(function* (_2) {
    const provider = (yield* _2(Ref.get(LocalProviders))).get(
      ProviderID
    );
    if (!provider?.removeSession) {
      return;
    }
    yield* _2(
      Effect.tryPromise(() => provider.removeSession(SessionID))
    );
  }), "RemoveSession");
  IPCService.RegisterInvokeHandler(
    "$createSession",
    ([id, scopes]) => Effect.runPromise(CreateSession(id, scopes))
  );
  IPCService.RegisterInvokeHandler(
    "$removeSession",
    ([id, sid]) => Effect.runPromise(RemoveSession(id, sid))
  );
  const ServiceImplementation = {
    GetSession: /* @__PURE__ */ __name((extension, providerId, scopes, options) => IPCService.SendRequest("$getSession", [
      extension.id,
      providerId,
      scopes,
      options
    ]).pipe(
      Effect.map(
        (info) => info ? ConvertSessionToVSCode(info) : void 0
      ),
      Effect.tapError(
        (err) => LogService.Error(
          `GetSession for provider '${providerId}' failed.`,
          err
        )
      )
    ), "GetSession"),
    ListSessions: /* @__PURE__ */ __name((extension, providerId, scopes) => IPCService.SendRequest("$getSessions", [
      extension.id,
      providerId,
      scopes
    ]).pipe(
      Effect.map((infos) => infos.map(ConvertSessionToVSCode)),
      Effect.tapError(
        (err) => LogService.Error(
          `ListSessions for provider '${providerId}' failed.`,
          err
        )
      ),
      Effect.catchAll(() => Effect.succeed([]))
      // Return empty array on failure
    ), "ListSessions"),
    RegisterAuthenticationProvider: /* @__PURE__ */ __name((ID, Label, Provider, Option) => Effect.gen(function* (_2) {
      const providers = yield* _2(Ref.get(LocalProviders));
      if (providers.has(ID)) {
        return yield* _2(
          Effect.fail(
            new AuthenticationProviderExistsError({
              ProviderID: ID
            })
          )
        );
      }
      yield* _2(
        Ref.update(LocalProviders, (map) => map.set(ID, Provider))
      );
      yield* _2(
        IPCService.SendNotification(
          "$registerAuthenticationProvider",
          [ID, Label, !!Option?.supportsMultipleAccounts]
        )
      );
      const disposable = {
        dispose: /* @__PURE__ */ __name(() => {
          Effect.runFork(
            Ref.update(
              LocalProviders,
              (map) => (map.delete(ID), map)
            ).pipe(
              Effect.flatMap(
                () => IPCService.SendNotification(
                  "$unregisterAuthenticationProvider",
                  [ID]
                )
              )
            )
          );
        }, "dispose")
      };
      return disposable;
    }), "RegisterAuthenticationProvider"),
    onDidChangeAuthenticationProviders: OnDidChangeProvidersEvent.Stream.pipe(Stream.toEvent),
    onDidChangeSessions: OnDidChangeSessionsEvent.Stream.pipe(
      Stream.toEvent
    )
  };
  return ServiceImplementation;
});
export {
  Definition
};
//# sourceMappingURL=Definition.js.map
