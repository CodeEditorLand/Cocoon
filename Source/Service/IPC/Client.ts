/*
 * File: Cocoon/Source/Service/IPC/Client.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:32:33 UTC
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
