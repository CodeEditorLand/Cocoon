/*
 * File: Cocoon/Source/Service/IPC/ProtocolAdapter.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:17:01 UTC
 * Dependency: ./ProtocolAdapter/Live.js, ./ProtocolAdapter/Service.js
 * Export: Live, Service
 */

/**
 * @module ProtocolAdapter (IPC)
 * @description Provides a `Layer` for the `ProtocolAdapter` service. This
 * adapter makes the gRPC communication channel compatible with VS Code's
 * `IMessagePassingProtocol`, which is required by `RPCProtocol`.
 */

import Live from "./ProtocolAdapter/Live.js";
import Service from "./ProtocolAdapter/Service.js";

export { Service, Live };
