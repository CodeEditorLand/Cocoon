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
  const shouldIntercept = Specifier === "vscode" || Specifier === "land";
  if (!shouldIntercept || !Context.parentURL || !MainThreadPort) {
    return NextResolve(Specifier, Context);
  }
  const RequestID = NextRequestID++;
  try {
    const ResolutionPromise = new Promise((resolve2, reject) => {
      const TimeoutID = setTimeout(() => {
        PendingPromises.delete(RequestID);
        reject(
          new Error(
            `Timeout resolving module import: "${Specifier}"`
          )
        );
      }, 5e3);
      PendingPromises.set(RequestID, {
        Resolve: resolve2,
        Reject: reject,
        TimeoutID
      });
    });
    MainThreadPort.postMessage({
      ID: RequestID,
      ImportingModuleURL: Context.parentURL,
      RequestedSpecifier: Specifier
    });
    const DynamicModuleURL = await ResolutionPromise;
    return { url: DynamicModuleURL, shortCircuit: true, format: "module" };
  } catch (error) {
    console.error(
      `[Cocoon ESM Loader Hook] Error resolving "${Specifier}": ${error.message}`
    );
    const promiseCallbacks = PendingPromises.get(RequestID);
    if (promiseCallbacks) {
      clearTimeout(promiseCallbacks.TimeoutID);
      PendingPromises.delete(RequestID);
    }
    return NextResolve(Specifier, Context);
  }
}
__name(resolve, "resolve");
function HandleResponseMessage(Response) {
  const { id: ID, url: URL, error: Error2 } = Response;
  const PromiseCallbacks = PendingPromises.get(ID);
  if (!PromiseCallbacks) return;
  clearTimeout(PromiseCallbacks.TimeoutID);
  PendingPromises.delete(ID);
  if (Error2) {
    PromiseCallbacks.Reject(
      new Error2(
        Error2.message || "Unknown resolution error from main thread"
      )
    );
  } else if (typeof URL === "string") {
    PromiseCallbacks.Resolve(URL);
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
  PendingPromises.forEach((Callbacks, ID) => {
    clearTimeout(Callbacks.TimeoutID);
    Callbacks.Reject(
      new Error(
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
