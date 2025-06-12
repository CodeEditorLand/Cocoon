var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
let MainThreadPort;
let NextRequestId = 0;
const PendingPromises = /* @__PURE__ */ new Map();
function initialize(Data) {
  if (!Data?.port) {
    console.error(
      "[Cocoon ESM Loader Hook] Initialization failed: MessagePort not received."
    );
    return;
  }
  MainThreadPort = Data.port;
  MainThreadPort.on("message", HandleResponseMessage);
  MainThreadPort.on("close", HandlePortClose);
}
__name(initialize, "initialize");
async function resolve(Specifier, Context, NextResolve) {
  const shouldIntercept = Specifier === "vscode" || Specifier === "land";
  if (!shouldIntercept || !Context.parentURL || !MainThreadPort) {
    return NextResolve(Specifier, Context);
  }
  const RequestId = NextRequestId++;
  try {
    const ResolutionPromise = new Promise((resolve2, reject) => {
      const TimeoutId = setTimeout(() => {
        PendingPromises.delete(RequestId);
        reject(
          new Error(
            `Timeout resolving module import: "${Specifier}"`
          )
        );
      }, 5e3);
      PendingPromises.set(RequestId, {
        Resolve: resolve2,
        Reject: reject,
        TimeoutId
      });
    });
    MainThreadPort.postMessage({
      Id: RequestId,
      ImportingModuleUrl: Context.parentURL,
      RequestedSpecifier: Specifier
    });
    const DynamicModuleUrl = await ResolutionPromise;
    return { url: DynamicModuleUrl, shortCircuit: true, format: "module" };
  } catch (error) {
    console.error(
      `[Cocoon ESM Loader Hook] Error resolving "${Specifier}": ${error.message}`
    );
    const promiseCallbacks = PendingPromises.get(RequestId);
    if (promiseCallbacks) {
      clearTimeout(promiseCallbacks.TimeoutId);
      PendingPromises.delete(RequestId);
    }
    return NextResolve(Specifier, Context);
  }
}
__name(resolve, "resolve");
function HandleResponseMessage(Event) {
  const { id: Id, url: Url, error: Error2 } = Event.data;
  const PromiseCallbacks = PendingPromises.get(Id);
  if (!PromiseCallbacks) return;
  clearTimeout(PromiseCallbacks.TimeoutId);
  PendingPromises.delete(Id);
  if (Error2) {
    PromiseCallbacks.Reject(
      new Error2(
        Error2.message || "Unknown resolution error from main thread"
      )
    );
  } else if (typeof Url === "string") {
    PromiseCallbacks.Resolve(Url);
  } else {
    PromiseCallbacks.Reject(
      new Error2(
        "Invalid response from main thread: missing 'url' or 'error' field."
      )
    );
  }
}
__name(HandleResponseMessage, "HandleResponseMessage");
function HandlePortClose() {
  console.log(
    "[Cocoon ESM Loader Hook] Communication port to main thread closed."
  );
  MainThreadPort = void 0;
  PendingPromises.forEach((Callbacks, Id) => {
    clearTimeout(Callbacks.TimeoutId);
    Callbacks.Reject(
      new Error(
        `Communication channel closed while request ID ${Id} was pending.`
      )
    );
  });
  PendingPromises.clear();
}
__name(HandlePortClose, "HandlePortClose");
export {
  initialize,
  resolve
};
//# sourceMappingURL=Hook.js.map
