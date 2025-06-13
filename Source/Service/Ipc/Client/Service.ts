/**
 * @module Service
 * @description Defines the service interface and `Context.Tag` for the low-level
 * gRPC client that communicates with the `Mountain` backend.
 */

import { Context } from "effect";

// This import assumes a tool like `ts-proto` has generated TypeScript types
// from the `vine.proto` file.
import type { MountainServiceClient } from "../../../Generated/vine.js";

/**
 * The service interface for the raw, generated gRPC client.
 *
 * Higher-level IPC services will use this client to make calls to `Mountain`.
 */
export type Service = MountainServiceClient;

/**
 * The `Context.Tag` for the gRPC client service.
 *
 * This tag is used by other services to declare their dependency on the raw
 * gRPC client.
 */
export const Tag = Context.Tag<Service>("IPC/Client");
