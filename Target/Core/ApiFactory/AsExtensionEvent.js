var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
const AsExtensionEvent = /* @__PURE__ */ __name((ExtensionID, Log, ActualEvent) => {
  return (Listener, ThisArgument, Disposables) => {
    const SafeListener = /* @__PURE__ */ __name((Event) => {
      try {
        Listener.call(ThisArgument, Event);
      } catch (error) {
        Log.Error(
          `[${ExtensionID.value}] FAILED to handle event:`,
          error
        );
      }
    }, "SafeListener");
    const Handle = ActualEvent(SafeListener);
    Disposables?.push(Handle);
    return Handle;
  };
}, "AsExtensionEvent");
var AsExtensionEvent_default = AsExtensionEvent;
export {
  AsExtensionEvent_default as default
};
//# sourceMappingURL=AsExtensionEvent.js.map
