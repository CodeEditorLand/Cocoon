/**
 * @module Client (IPC)
 * @description Provides a managed gRPC client connection from `Cocoon` to
 * `Mountain`, exposing the connection as a `Layer` that can be used by other
 * services.
 */

import Live from "./Client/Live.js";
import Service from "./Client/Service.js";

export { Service, Live };
