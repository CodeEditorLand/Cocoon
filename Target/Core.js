import { Layer } from "effect";
import { Live as LiveAPIFactory } from "./Core/APIFactory.js";
import { Live as LiveESMInterceptor } from "./Core/ESMInterceptor.js";
import { Live as LiveExtensionHost } from "./Core/ExtensionHost.js";
import { Live as LiveExtensionPath } from "./Core/ExtensionPath.js";
import { Live as LiveHostKindPicker } from "./Core/HostKindPicker.js";
import { Live as LiveNodeModuleShim } from "./Core/NodeModuleShim.js";
import { Live as LiveRequireInterceptor } from "./Core/RequireInterceptor.js";
import * as APIFactory from "./Core/APIFactory.js";
import * as ESMInterceptor from "./Core/ESMInterceptor.js";
import * as ExtensionHost from "./Core/ExtensionHost.js";
import * as ExtensionPath from "./Core/ExtensionPath.js";
import * as HostKindPicker from "./Core/HostKindPicker.js";
import * as NodeModuleShim from "./Core/NodeModuleShim.js";
import * as RequireInterceptor from "./Core/RequireInterceptor.js";
const CoreServiceLayer = Layer.mergeAll(
  LiveAPIFactory,
  LiveESMInterceptor,
  LiveExtensionHost,
  LiveExtensionPath,
  LiveHostKindPicker,
  LiveNodeModuleShim,
  LiveRequireInterceptor
);
export {
  APIFactory,
  CoreServiceLayer,
  ESMInterceptor,
  ExtensionHost,
  ExtensionPath,
  HostKindPicker,
  NodeModuleShim,
  RequireInterceptor
};
//# sourceMappingURL=Core.js.map
