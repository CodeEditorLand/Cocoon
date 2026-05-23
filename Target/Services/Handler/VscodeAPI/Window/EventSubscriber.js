var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/Window/EventSubscriber.ts
var MakeEventSubscriber = /* @__PURE__ */ __name((Context, EventName) => (Callback, ThisArg, Disposables) => {
  const Bound = ThisArg === void 0 ? Callback : Callback.bind(ThisArg);
  Context.Emitter.on(EventName, Bound);
  const Subscription = {
    dispose: /* @__PURE__ */ __name(() => {
      Context.Emitter.off(EventName, Bound);
    }, "dispose")
  };
  if (Disposables && typeof Disposables.push === "function") {
    Disposables.push(Subscription);
  }
  return Subscription;
}, "MakeEventSubscriber");
export {
  MakeEventSubscriber
};
//# sourceMappingURL=EventSubscriber.js.map
