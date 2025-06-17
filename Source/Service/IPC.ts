/*
 * File: Cocoon/Source/Service/IPC.ts
 * Responsibility: Provides the primary IPC service for the Cocoon sidecar, implementing gRPC communication with the Mountain backend to enable VS Code extension hosting and interaction.
 * Modified: 2025-06-17 10:52:55 UTC
 * Dependency: ./IPC/Configuration.js, ./IPC/Error.js, ./IPC/Live.js, ./IPC/Service.js
 * Export: Error, Live, Service, type IPCConfiguration
 */

/**
 * @module IPC
 * @description This module provides the primary Inter-Process Communication (IPC)
 * service for Cocoon. It provides a managed gRPC connection to and from the
 * Mountain host, exposing high-level effects for communication.
 */

import { type IPCConfiguration } from "./IPC/Configuration.js";
import * as Error from "./IPC/Error.js";
import Live from "./IPC/Live.js";
import Service from "./IPC/Service.js";

export { Service, Live, type IPCConfiguration, Error };
