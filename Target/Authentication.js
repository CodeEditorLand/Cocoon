var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Effect } from "effect";
import { NodeExtHostAuthentication } from "vs/workbench/api/node/extHostAuthentication.js";
import { Emitter } from "vs/base/common/event.js";
import { IPCService } from "./IPC.js";
import { InitDataService } from "./InitData.js";
import { WindowService } from "./Window.js";
import { LoggerService } from "./Logger.js";
class AuthenticationService extends Effect.Service()(
  "Service/Authentication",
  {
    effect: Effect.gen(function* () {
      const IPC = yield* IPCService;
      const InitData = yield* InitDataService;
      const Window = yield* WindowService;
      const Logger = yield* LoggerService;
      const RpcServiceAdapter = {
        _serviceBrand: void 0,
        getProxy: /* @__PURE__ */ __name((Identifier) => IPC.CreateProxy(Identifier.path), "getProxy"),
        set: /* @__PURE__ */ __name((_id, _instance) => _instance, "set"),
        dispose: /* @__PURE__ */ __name(() => {
        }, "dispose"),
        assertRegistered: /* @__PURE__ */ __name(() => {
        }, "assertRegistered"),
        drain: /* @__PURE__ */ __name(() => Promise.resolve(), "drain")
      };
      const UrlsServiceStub = {
        _serviceBrand: void 0,
        registerUriHandler: /* @__PURE__ */ __name(() => ({ dispose: /* @__PURE__ */ __name(() => {
        }, "dispose") }), "registerUriHandler"),
        setDelegate: /* @__PURE__ */ __name(() => {
        }, "setDelegate"),
        createAppUri: /* @__PURE__ */ __name((uri) => Promise.resolve(uri), "createAppUri"),
        get onDidOpenUri() {
          return new Emitter().event;
        },
        resolveExternalUri: /* @__PURE__ */ __name(() => Promise.resolve({
          resolved: "file:///",
          dispose: /* @__PURE__ */ __name(() => {
          }, "dispose")
        }), "resolveExternalUri"),
        handleExternalQuery: /* @__PURE__ */ __name(() => Promise.resolve(false), "handleExternalQuery")
      };
      const ProgressServiceStub = {
        _serviceBrand: void 0,
        _proxy: void 0,
        _handles: /* @__PURE__ */ new Map(),
        _mapHandleToCancellationSource: /* @__PURE__ */ new Map(),
        withProgress: /* @__PURE__ */ __name(() => Promise.resolve(void 0), "withProgress"),
        withProgressFromSource: /* @__PURE__ */ __name(() => Promise.resolve(), "withProgressFromSource"),
        $showProgress: /* @__PURE__ */ __name(() => {
        }, "$showProgress"),
        $hideProgress: /* @__PURE__ */ __name(() => {
        }, "$hideProgress"),
        $resolveProgressStep: /* @__PURE__ */ __name(() => {
        }, "$resolveProgressStep")
      };
      return new NodeExtHostAuthentication(
        RpcServiceAdapter,
        InitData,
        Window,
        UrlsServiceStub,
        ProgressServiceStub,
        Logger,
        Logger
      );
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
