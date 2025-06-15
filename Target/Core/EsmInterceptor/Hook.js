var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
let MainThreadPort;
let NextRequestID = 0;
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
  const ShouldIntercept = Specifier === "vscode";
  if (!ShouldIntercept || !Context.parentURL || !MainThreadPort) {
    return NextResolve(Specifier, Context);
  }
  const RequestID = NextRequestID++;
  try {
    const ResolutionPromise = new Promise((Resolve, Reject) => {
      const TimeoutID = setTimeout(() => {
        PendingPromises.delete(RequestID);
        Reject(
          new globalThis.Error(
            `Timeout resolving module import: "${Specifier}"`
          )
        );
      }, 5e3);
      PendingPromises.set(RequestID, { Resolve, Reject, TimeoutID });
    });
    MainThreadPort.postMessage({
      ID: RequestID,
      ImportingModuleURL: Context.parentURL,
      RequestedSpecifier: Specifier
    });
    const DynamicModuleURL = await ResolutionPromise;
    return { url: DynamicModuleURL, shortCircuit: true, format: "module" };
  } catch (Error2) {
    console.error(
      `[Cocoon ESM Loader Hook] Error resolving "${Specifier}": ${Error2.message}`
    );
    const PromiseCallbacks = PendingPromises.get(RequestID);
    if (PromiseCallbacks) {
      clearTimeout(PromiseCallbacks.TimeoutID);
      PendingPromises.delete(RequestID);
    }
    return NextResolve(Specifier, Context);
  }
}
__name(resolve, "resolve");
function HandleResponseMessage(Response) {
  const { id: ID, url: URL, error: ErrorResponse } = Response;
  const PromiseCallbacks = PendingPromises.get(ID);
  if (!PromiseCallbacks) return;
  clearTimeout(PromiseCallbacks.TimeoutID);
  PendingPromises.delete(ID);
  if (ErrorResponse) {
    PromiseCallbacks.Reject(
      new globalThis.Error(
        ErrorResponse.message || "Unknown resolution error from main thread"
      )
    );
  } else if (typeof URL === "string") {
    PromiseCallbacks.Resolve(URL);
  } else {
    PromiseCallbacks.Reject(
      new globalThis.Error(
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
  PendingPromises.forEach((Callbacks, ID) => {
    clearTimeout(Callbacks.TimeoutID);
    Callbacks.Reject(
      new globalThis.Error(
        `Communication channel closed while request ID ${ID} was pending.`
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
