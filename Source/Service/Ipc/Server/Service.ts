/**
 * @module Service
 * @description Defines the service type and `Context.Tag` for the `Cocoon` gRPC
 * server instance.
 */

import type * as Grpc from "@grpc/grpc-js";
import { Context } from "effect";

/**
 * The service type, which is the underlying `grpc.Server` class.
 */
export type Service = Grpc.Server;

/**
 * The `Context.Tag` for the gRPC server instance.
 *
 * This tag provides access to the raw server object if needed, for example,
 * by the `acquireRelease` logic that manages its lifecycle.
 */
export const Tag = Context.Tag<Service>("Ipc/Server");
