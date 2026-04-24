var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Telemetry/PostHog/Configuration.ts
var DefaultKey = "";
var DefaultHost = "https://eu.i.posthog.com";
var DefaultBatchWindowMilliseconds = 3e3;
var DefaultBatchMaximum = 50;
var ReadString = /* @__PURE__ */ __name((Key, Fallback) => {
  const Value = process.env[Key];
  return Value && Value.length > 0 ? Value : Fallback;
}, "ReadString");
var ReadBoolean = /* @__PURE__ */ __name((Key, Fallback) => {
  const Value = process.env[Key];
  if (Value === void 0) return Fallback;
  return !["false", "0", "off", ""].includes(Value.toLowerCase());
}, "ReadBoolean");
var ReadNumber = /* @__PURE__ */ __name((Key, Fallback) => {
  const Value = process.env[Key];
  const Parsed = Value ? Number(Value) : Number.NaN;
  return Number.isFinite(Parsed) && Parsed > 0 ? Parsed : Fallback;
}, "ReadNumber");
var Configuration_default = /* @__PURE__ */ __name(() => ({
  Key: ReadString("LAND_POSTHOG_KEY", DefaultKey),
  Host: ReadString("LAND_POSTHOG_HOST", DefaultHost),
  Enabled: ReadBoolean("LAND_POSTHOG_COCOON_ENABLED", true) && process.env["NODE_ENV"] !== "production",
  BatchWindowMilliseconds: ReadNumber(
    "LAND_POSTHOG_COCOON_BATCH_WINDOW_MS",
    DefaultBatchWindowMilliseconds
  ),
  BatchMaximum: ReadNumber(
    "LAND_POSTHOG_COCOON_BATCH_MAX",
    DefaultBatchMaximum
  ),
  DistinctIdentifierSeed: process.env["LAND_POSTHOG_DISTINCT_ID"] ?? ""
}), "default");
export {
  Configuration_default as default
};
//# sourceMappingURL=Configuration.js.map
