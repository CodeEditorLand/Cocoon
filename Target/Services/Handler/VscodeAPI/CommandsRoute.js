var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/Handler/VscodeAPI/CommandsRoute.ts
function Route(CommandId, Registry) {
  return Registry.Has(CommandId) ? "local" : "mountain";
}
__name(Route, "Route");
var LogRoute = /* @__PURE__ */ __name((CommandId, Decision) => {
  if (!process.env["LAND_DEV_LOG"]) return;
  process.stdout.write(
    `[DEV:CMD-ROUTE] cmd=${CommandId} route=${Decision}
`
  );
}, "LogRoute");
export {
  LogRoute,
  Route
};
//# sourceMappingURL=CommandsRoute.js.map
