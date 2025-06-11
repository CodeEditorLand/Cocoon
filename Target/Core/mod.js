import { Layer } from "effect";
import { Live as LiveApiFactory } from "./ApiFactory/mod.js";
import { Live as LiveExtensionHost } from "./ExtensionHost/mod.js";
import { Live as LiveExtensionPaths } from "./ExtensionPaths/mod.js";
import { Live as LiveRequireInterceptor } from "./RequireInterceptor/mod.js";
import * as ApiFactory from "./ApiFactory/mod.js";
import * as ExtensionHost from "./ExtensionHost/mod.js";
import * as ExtensionPaths from "./ExtensionPaths/mod.js";
import * as RequireInterceptor from "./RequireInterceptor/mod.js";
const CoreServicesLayer = Layer.mergeAll(
  LiveApiFactory,
  LiveExtensionHost,
  LiveExtensionPaths,
  LiveRequireInterceptor
);
export {
  ApiFactory,
  CoreServicesLayer,
  ExtensionHost,
  ExtensionPaths,
  RequireInterceptor
};
//# sourceMappingURL=mod.js.map
