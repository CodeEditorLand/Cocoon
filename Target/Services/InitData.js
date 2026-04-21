var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// Source/Services/InitData.ts
import { Context, Layer } from "effect";
var InitDataService = class extends Context.Tag("Cocoon/InitData")() {
  static {
    __name(this, "InitDataService");
  }
};
var ResolvedVersion = process.env["ProductVersion"] ?? "1.118.0";
var ResolvedCommit = process.env["ProductCommit"] ?? "dev";
var InitDataLive = Layer.succeed(InitDataService, {
  commit: ResolvedCommit,
  version: ResolvedVersion,
  parentPid: process.pid,
  extensions: [],
  workspace: null,
  environment: {}
});
export {
  InitDataLive,
  InitDataService
};
//# sourceMappingURL=InitData.js.map
