var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { IPCService } from "./IPC.js";
import { LoggerService } from "./Logger.js";
import { CreateEventStream } from "./Utility/CreateEventStream.js";
class AuthenticationService extends Effect.Service()(
  "Service/Authentication",
  {
    effect: Effect.gen(function* () {
      const IPC = yield* IPCService;
      const Logger = yield* LoggerService;
      const ProviderInfosReference = yield* Ref.make([]);
      const { event: OnDidChangeSessionsEvent } = CreateEventStream();
      const GetProviderInfos = /* @__PURE__ */ __name(() => IPC.SendRequest("$getAuthenticationProviders", []).pipe(
        Effect.map(
          (DataTransferObjects) => DataTransferObjects.map((DTO) => ({
            id: DTO.id,
            label: DTO.label
          }))
        ),
        Effect.tap(
          (Infos) => Ref.set(ProviderInfosReference, Infos)
        ),
        Effect.mapError((Cause) => new Error(String(Cause)))
      ), "GetProviderInfos");
      yield* Effect.forkDaemon(GetProviderInfos());
      const GetSession = /* @__PURE__ */ __name((ProviderId, Scopes, Options) => IPC.SendRequest(
        "$getSession",
        [ProviderId, Scopes, Options ?? {}]
      ).pipe(Effect.mapError((Cause) => new Error(String(Cause)))), "GetSession");
      const GetAccounts = /* @__PURE__ */ __name((ProviderId) => IPC.SendRequest(
        "$getAccounts",
        [ProviderId]
      ).pipe(Effect.mapError((Cause) => new Error(String(Cause)))), "GetAccounts");
      const ServiceImplementation = {
        getSession: /* @__PURE__ */ __name((ProviderId, Scopes, Options) => Effect.runPromise(GetSession(ProviderId, Scopes, Options)), "getSession"),
        getAccounts: /* @__PURE__ */ __name((ProviderId) => Effect.runPromise(GetAccounts(ProviderId)), "getAccounts"),
        onDidChangeSessions: OnDidChangeSessionsEvent,
        registerAuthenticationProvider: /* @__PURE__ */ __name((_Id, _Label, _Provider, _Options) => {
          Effect.runSync(
            Logger.Debug(
              "STUB: registerAuthenticationProvider called."
            )
          );
          return { dispose: /* @__PURE__ */ __name(() => {
          }, "dispose") };
        }, "registerAuthenticationProvider"),
        getProviderInfos: /* @__PURE__ */ __name(() => Effect.runPromise(GetProviderInfos()), "getProviderInfos"),
        getSessions: /* @__PURE__ */ __name((ProviderId, Scopes, Options) => (
          // A real implementation would be more nuanced, but for now we can
          // just delegate to a method that might exist on the host.
          Effect.runPromise(
            IPC.SendRequest(
              "$getSessions",
              [ProviderId, Scopes, Options]
            ).pipe(
              Effect.mapError(
                (Cause) => new Error(String(Cause))
              )
            )
          )
        ), "getSessions"),
        login: /* @__PURE__ */ __name((ProviderId, Scopes, Options) => Effect.runPromise(
          IPC.SendRequest("$login", [
            ProviderId,
            Scopes,
            Options
          ]).pipe(
            Effect.mapError(
              (Cause) => new Error(String(Cause))
            )
          )
        ), "login"),
        logout: /* @__PURE__ */ __name((ProviderId, SessionId) => Effect.runPromise(
          IPC.SendNotification("$logout", [
            ProviderId,
            SessionId
          ]).pipe(
            Effect.mapError(
              (Cause) => new Error(String(Cause))
            )
          )
        ), "logout")
      };
      return ServiceImplementation;
    })
  }
) {
  static {
    __name(this, "AuthenticationService");
  }
}
export {
  AuthenticationService
};
//# sourceMappingURL=Authentication.js.map
