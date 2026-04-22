var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Telemetry/PostHog/Event.ts
var BaseProperties = {
  $app: "land-editor",
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
var Enrich = /* @__PURE__ */ __name((Properties) => ({
  ...Properties,
  ...BaseProperties,
  $node_version: process.version
}), "Enrich");
var Event_default = { Create, Enrich };
export {
  Create,
  Enrich,
  Event_default as default
};
//# sourceMappingURL=Event.js.map
