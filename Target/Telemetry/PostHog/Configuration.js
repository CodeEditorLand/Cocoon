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
var TelemetryCaptureEnabled = ReadBoolean("Capture", true);
var Configuration_default = /* @__PURE__ */ __name(() => ({
  Key: ReadString("Authorize", DefaultKey),
  Host: ReadString("Beam", DefaultHost),
  Enabled: ReadBoolean("Report", true) && TelemetryCaptureEnabled && process.env["NODE_ENV"] !== "production",
  BatchWindowMilliseconds: ReadNumber(
    "Buffer",
    DefaultBatchWindowMilliseconds
  ),
  BatchMaximum: ReadNumber("Batch", DefaultBatchMaximum),
  DistinctIdentifierSeed: process.env["Brand"] ?? "",
  OTLPEndpoint: ReadString("OTLPEndpoint", "http://127.0.0.1:4318"),
  OTLPEnabled: ReadBoolean("OTLPEnabled", true) && TelemetryCaptureEnabled && process.env["NODE_ENV"] !== "production"
}), "default");
export {
  Configuration_default as default
};
//# sourceMappingURL=Configuration.js.map
