var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Telemetry/PostHog/Identifier.ts
var Identifier_default = /* @__PURE__ */ __name((Seed) => {
  if (Seed.length > 0) return Seed;
  const Username = process.env["USER"] ?? process.env["USERNAME"] ?? "unknown";
  return `land-dev-${Username}`;
}, "default");
export {
  Identifier_default as default
};
//# sourceMappingURL=Identifier.js.map
