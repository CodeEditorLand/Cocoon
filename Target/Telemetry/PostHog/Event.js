var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Telemetry/PostHog/Event.ts
var BaseProperties = {
  $app: "fiddee",
  $app_version: "0.0.1",
  $build_mode: "debug",
  $component: "cocoon",
  $tier: "cocoon",
  $lib: "cocoon-posthog-bridge"
};
var Create = /* @__PURE__ */ __name((Name, Properties = {}) => ({
  Name,
  Timestamp: (/* @__PURE__ */ new Date()).toISOString(),
  Properties
}), "Create");
var CurrentTraceIdentifier;
var SetTraceIdentifier = /* @__PURE__ */ __name((Identifier) => {
  CurrentTraceIdentifier = Identifier;
}, "SetTraceIdentifier");
var Enrich = /* @__PURE__ */ __name((Properties) => ({
  ...Properties,
  ...BaseProperties,
  $node_version: process.version,
  ...CurrentTraceIdentifier ? { $trace_id: CurrentTraceIdentifier } : {}
}), "Enrich");
var Event_default = { Create, Enrich, SetTraceIdentifier };
export {
  Create,
  Enrich,
  SetTraceIdentifier,
  Event_default as default
};
//# sourceMappingURL=Event.js.map
