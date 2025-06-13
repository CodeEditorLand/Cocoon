var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
function AsExtensionEvent(ExtensionID, LogService, ActualEvent) {
  return (Listener, ThisArgument, Disposables) => {
    const SafeListener = /* @__PURE__ */ __name((Event) => {
      try {
        Listener.call(ThisArgument, Event);
      } catch (Error2) {
        LogService.Error(
          `[${ExtensionID.value}] FAILED to handle event:`,
          Error2
        );
      }
    }, "SafeListener");
    const Handle = ActualEvent(SafeListener);
    Disposables?.push(Handle);
    return Handle;
  };
}
__name(AsExtensionEvent, "AsExtensionEvent");
export {
  AsExtensionEvent
};
//# sourceMappingURL=AsExtensionEvent.js.map
