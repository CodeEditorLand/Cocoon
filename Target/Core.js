import { Layer } from "effect";
import { Live as APIFactoryLive } from "./Core/APIFactory.js";
import { Live as ESMInterceptorLive } from "./Core/ESMInterceptor.js";
import { Live as ExtensionHostLive } from "./Core/ExtensionHost.js";
import { Live as ExtensionPathLive } from "./Core/ExtensionPath.js";
import { Live as HostKindPickerLive } from "./Core/HostKindPicker.js";
import { Live as NodeModuleShimLive } from "./Core/NodeModuleShim.js";
import { Live as RequireInterceptorLive } from "./Core/RequireInterceptor.js";
var Core_default = Layer.mergeAll(
  APIFactoryLive,
  ESMInterceptorLive,
  ExtensionHostLive,
  ExtensionPathLive,
  HostKindPickerLive,
  NodeModuleShimLive,
  RequireInterceptorLive
);
export {
  Core_default as default
};
//# sourceMappingURL=Core.js.map
