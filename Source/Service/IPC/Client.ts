/*
 * File: Cocoon/Source/Service/IPC/Client.ts
 * Responsibility:
 * Modified: 2025-06-15 19:17:03 UTC
 * Dependency: ./Client/Live.js, ./Client/Service.js
 * Export: Live, Service
 */

/**
 * @module Client (IPC)
 * @description Provides a managed gRPC client connection from `Cocoon` to
 * `Mountain`, exposing the connection as a `Layer` that can be used by other
 * services.
 */

import Live from "./Client/Live.js";
import Service from "./Client/Service.js";

export { Service, Live };
