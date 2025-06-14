/**
 * @module Server (IPC)
 * @description Provides a `Layer` for the managed gRPC server, which listens
 * for incoming requests from the `Mountain` backend.
 */

import Live from "./Server/Live.js";
import Service from "./Server/Service.js";

export { Service, Live };
