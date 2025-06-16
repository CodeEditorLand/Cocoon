/*
 * File: Cocoon/Source/Service/IPC/Server/Service.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:17:00 UTC
 * Dependency: @grpc/grpc-js, effect
 * Export: ServerService
 */

/**
 * @module Service (IPC/Server)
 * @description Defines the service type and `Context.Tag` for the `Cocoon` gRPC
 * server instance.
 */

import type * as gRPC from "@grpc/grpc-js";
import { Context } from "effect";

/**
 * The `Context.Tag` for the gRPC server instance.
 *
 * This tag provides access to the raw server object if needed, for example,
 * by the `acquireRelease` logic that manages its lifecycle.
 */
export default class ServerService extends Context.Tag("IPC/Server")<
	ServerService,
	gRPC.Server
>() {}
