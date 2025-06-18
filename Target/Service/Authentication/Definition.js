var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import CreateEventStream from "../../Utility/CreateEventStream.js";
import IPCService from "../IPC/Service.js";
import LogService from "../Log/Service.js";
import AuthenticationProviderExistsError from "./Error/AuthenticationProviderExistsError.js";
import AuthenticationProviderRegistrationError from "./Error/AuthenticationProviderRegistrationError.js";
import { ConvertSessionToInternal, ConvertSessionToVSCode } from "./Type.js";
var Definition_default = Effect.gen(function* () {
  const IPC = yield* IPCService;
  const Log = yield* LogService;
  const LocalProviders = yield* Ref.make(
    /* @__PURE__ */ new Map()
  );
  const OnDidChangeProvidersEvent = CreateEventStream();
  const OnDidChangeSessionsEvent = CreateEventStream();
  const CreateSession = /* @__PURE__ */ __name((ProviderID, Scopes) => Effect.gen(function* () {
    const Provider = (yield* Ref.get(LocalProviders)).get(ProviderID);
    if (!Provider) {
      return yield* Effect.fail(
        new Error(
          `No auth provider with id '${ProviderID}' is registered.`
        )
      );
    }
    const Session = yield* Effect.tryPromise({
      try: /* @__PURE__ */ __name(() => Provider.createSession(Scopes, {}), "try"),
      catch: /* @__PURE__ */ __name((CaughtError) => CaughtError, "catch")
    });
    return ConvertSessionToInternal(Session);
  }), "CreateSession");
  const RemoveSession = /* @__PURE__ */ __name((ProviderID, SessionID) => Effect.gen(function* () {
    const Provider = (yield* Ref.get(LocalProviders)).get(ProviderID);
    if (!Provider?.removeSession) {
      return;
    }
    yield* Effect.tryPromise({
      try: /* @__PURE__ */ __name(() => Provider.removeSession(SessionID), "try"),
      catch: /* @__PURE__ */ __name((CaughtError) => CaughtError, "catch")
    });
  }), "RemoveSession");
  yield* Effect.sync(
    () => IPC.RegisterInvokeHandler(
      "$createSession",
      ([ID, Scopes]) => Effect.runPromise(CreateSession(ID, Scopes))
    )
  );
  yield* Effect.sync(
    () => IPC.RegisterInvokeHandler(
      "$removeSession",
      ([ID, SessionID]) => Effect.runPromise(RemoveSession(ID, SessionID))
    )
  );
  const AuthenticationImplementation = {
    GetSession: /* @__PURE__ */ __name((RequestingExtension, ProviderID, Scopes, Options) => IPC.SendRequest("$getSession", [
      RequestingExtension.id,
      ProviderID,
      Scopes,
      Options
      // This will require a new TypeConverter in a real implementation
    ]).pipe(
      Effect.map(
        (Info) => Info ? ConvertSessionToVSCode(Info) : void 0
      ),
      Effect.tapError(
        (Error2) => Log.Error(
          `GetSession for provider '${ProviderID}' failed.`,
          Error2
        )
      ),
      Effect.mapError((e) => new Error(String(e)))
    ), "GetSession"),
    ListSessions: /* @__PURE__ */ __name((RequestingExtension, ProviderID, Scopes) => IPC.SendRequest("$getSessions", [
      RequestingExtension.id,
      ProviderID,
      Scopes
    ]).pipe(
      Effect.map((Infos) => Infos.map(ConvertSessionToVSCode)),
      Effect.tapError(
        (Error2) => Log.Error(
          `ListSessions for provider '${ProviderID}' failed.`,
          Error2
        )
      ),
      Effect.mapError((e) => new Error(String(e))),
      Effect.catchAll(() => Effect.succeed([]))
    ), "ListSessions"),
    RegisterAuthenticationProvider: /* @__PURE__ */ __name((ID, Label, Provider, Options) => Effect.gen(function* () {
      const Providers = yield* Ref.get(LocalProviders);
      if (Providers.has(ID)) {
        return yield* Effect.fail(
          new AuthenticationProviderExistsError({
            ProviderID: ID
          })
        );
      }
      yield* Ref.update(
        LocalProviders,
        (Map2) => Map2.set(ID, Provider)
      );
      yield* IPC.SendNotification("$registerAuthenticationProvider", [
        ID,
        Label,
        !!Options?.supportsMultipleAccounts
      ]).pipe(
        Effect.mapError(
          (cause) => new AuthenticationProviderRegistrationError({
            cause
          })
        )
      );
      const Disposable = {
        dispose: /* @__PURE__ */ __name(() => {
          const CleanupEffect = Ref.update(
            LocalProviders,
            (Map2) => (Map2.delete(ID), Map2)
          ).pipe(
            Effect.flatMap(
              () => IPC.SendNotification(
                "$unregisterAuthenticationProvider",
                [ID]
              )
            )
          );
          Effect.runFork(CleanupEffect);
        }, "dispose")
      };
      return Disposable;
    }), "RegisterAuthenticationProvider"),
    onDidChangeAuthenticationProviders: OnDidChangeProvidersEvent.event,
    onDidChangeSessions: OnDidChangeSessionsEvent.event
  };
  return AuthenticationImplementation;
});
export {
  Definition_default as default
};
//# sourceMappingURL=Definition.js.map
