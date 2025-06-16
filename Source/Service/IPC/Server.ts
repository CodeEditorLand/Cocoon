/*
 * File: Cocoon/Source/Service/IPC/Server.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:16:59 UTC
 * Dependency: ./Server/Live.js, ./Server/Service.js
 * Export: Live, Service
 */

/**
 * @module Server (IPC)
 * @description Provides a `Layer` for the managed gRPC server, which listens
 * for incoming requests from the `Mountain` backend.
 */

import Live from "./Server/Live.js";
import Service from "./Server/Service.js";

export { Service, Live };
