var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect, Ref } from "effect";
import { CreateEventStream } from "./Utility/CreateEventStream.js";
import { IPCService } from "./IPC.js";
import { LoggerService } from "./Logger.js";
class AuthenticationService extends Effect.Service()(
  "Service/Authentication",
  {
    effect: Effect.gen(function* () {
      const IPC = yield* IPCService;
      const Logger = yield* LoggerService;
      const ProviderInfosRef = yield* Ref.make([]);
      const { event: OnDidChangeSessionsEvent } = CreateEventStream();
      const GetProviderInfos = /* @__PURE__ */ __name(() => IPC.SendRequest("$getAuthenticationProviders").pipe(
        Effect.map(
          (dtos) => dtos.map((dto) => ({ id: dto.id, label: dto.label }))
        ),
        Effect.tap((infos) => Ref.set(ProviderInfosRef, infos)),
        Effect.mapError((cause) => new Error(String(cause)))
      ), "GetProviderInfos");
      yield* Effect.forkDaemon(GetProviderInfos());
      const GetSession = /* @__PURE__ */ __name((providerId, scopes, options) => IPC.SendRequest(
        "$getSession",
        [providerId, scopes, options ?? {}]
      ).pipe(Effect.mapError((cause) => new Error(String(cause)))), "GetSession");
      const GetAccounts = /* @__PURE__ */ __name((providerId) => IPC.SendRequest(
        "$getAccounts",
        [providerId]
      ).pipe(Effect.mapError((cause) => new Error(String(cause)))), "GetAccounts");
      const Service = {
        getSession: /* @__PURE__ */ __name((providerId, scopes, options) => Effect.runPromise(GetSession(providerId, scopes, options)), "getSession"),
        getAccounts: /* @__PURE__ */ __name((providerId) => Effect.runPromise(GetAccounts(providerId)), "getAccounts"),
        onDidChangeSessions: OnDidChangeSessionsEvent,
        registerAuthenticationProvider: /* @__PURE__ */ __name((_id, _label, _provider, _options) => {
          Effect.runSync(
            Logger.Debug(
              "STUB: registerAuthenticationProvider called."
            )
          );
          return { dispose: /* @__PURE__ */ __name(() => {
          }, "dispose") };
        }, "registerAuthenticationProvider"),
        getProviderInfos: /* @__PURE__ */ __name(() => Effect.runPromise(GetProviderInfos()), "getProviderInfos"),
        getSessions: /* @__PURE__ */ __name((providerId, scopes, options) => (
          // A real implementation would be more nuanced, but for now we can
          // just delegate to a method that might exist on the host.
          Effect.runPromise(
            IPC.SendRequest(
              "$getSessions",
              [providerId, scopes, options]
            ).pipe(
              Effect.mapError(
                (cause) => new Error(String(cause))
              )
            )
          )
        ), "getSessions"),
        login: /* @__PURE__ */ __name((providerId, scopes, options) => Effect.runPromise(
          IPC.SendRequest("$login", [
            providerId,
            scopes,
            options
          ]).pipe(
            Effect.mapError(
              (cause) => new Error(String(cause))
            )
          )
        ), "login"),
        logout: /* @__PURE__ */ __name((providerId, sessionId) => Effect.runPromise(
          IPC.SendNotification("$logout", [
            providerId,
            sessionId
          ]).pipe(
            Effect.mapError(
              (cause) => new Error(String(cause))
            )
          )
        ), "logout")
      };
      return Service;
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
