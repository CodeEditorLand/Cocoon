/**
 * @module ProtocolAdapter (IPC)
 * @description Provides a `Layer` for the `ProtocolAdapter` service. This
 * adapter makes the gRPC communication channel compatible with VS Code's
 * `IMessagePassingProtocol`, which is required by `RPCProtocol`.
 */

import Live from "./ProtocolAdapter/Live.js";
import Service from "./ProtocolAdapter/Service.js";

export { Service, Live };
