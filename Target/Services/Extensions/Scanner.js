var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Extensions/Scanner.ts
var ScanAllExtensions = /* @__PURE__ */ __name((Context, _Options = {}) => Array.from(
  Context.ExtensionRegistry.values()
), "ScanAllExtensions");
var ScanSystemExtensions = /* @__PURE__ */ __name((Context) => Array.from(Context.ExtensionRegistry.values()).filter(
  (Extension) => Extension?.isBuiltin === true
), "ScanSystemExtensions");
var ScanUserExtensions = /* @__PURE__ */ __name((Context) => Array.from(Context.ExtensionRegistry.values()).filter(
  (Extension) => Extension?.isBuiltin === false
), "ScanUserExtensions");
var GetExtension = /* @__PURE__ */ __name((Context, Identifier) => Context.ExtensionRegistry.get(Identifier), "GetExtension");
var GetStatistics = /* @__PURE__ */ __name((Context) => {
  const All = Array.from(Context.ExtensionRegistry.values());
  let Builtin = 0;
  let User = 0;
  for (const Extension of All) {
    if (Extension?.isBuiltin === true) {
      Builtin++;
    } else {
      User++;
    }
  }
  return {
    totalExtensions: All.length,
    builtinCount: Builtin,
    userCount: User,
    activationEventCount: Context.ActivationEventIndex.size
  };
}, "GetStatistics");
var Scanner_default = {
  ScanAllExtensions,
  ScanSystemExtensions,
  ScanUserExtensions,
  GetExtension,
  GetStatistics
};
export {
  GetExtension,
  GetStatistics,
  ScanAllExtensions,
  ScanSystemExtensions,
  ScanUserExtensions,
  Scanner_default as default
};
//# sourceMappingURL=Scanner.js.map
