var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/Languages/RegisterProvider.ts
var RegisterProvider = /* @__PURE__ */ __name((Context, LanguageProviderRegistry, MethodName, Selector, Provider) => {
  if (Provider == null || typeof Provider !== "object") {
    return { dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") };
  }
  let Handle;
  try {
    Handle = LanguageProviderRegistry.RegisterAutoHandle(Provider);
  } catch {
    return { dispose: /* @__PURE__ */ __name(() => {
    }, "dispose") };
  }
  const Language = typeof Selector === "string" ? Selector : typeof Selector?.language === "string" ? Selector.language : "*";
  Context.SendToMountain(MethodName, {
    handle: Handle,
    languageSelector: Language,
    extensionId: ""
  }).catch(() => {
  });
  return {
    dispose: /* @__PURE__ */ __name(() => {
      try {
        LanguageProviderRegistry.Unregister(Handle);
      } catch {
      }
    }, "dispose")
  };
}, "RegisterProvider");
export {
  RegisterProvider
};
//# sourceMappingURL=RegisterProvider.js.map
