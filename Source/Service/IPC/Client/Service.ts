/**
 * @module Service (IPC/Client)
 * @description Defines the service interface and `Context.Tag` for the low-level
 * gRPC client that communicates from Cocoon to the `Mountain` backend.
 */

import { Context } from "effect";

// This import assumes a tool like `ts-proto` has generated TypeScript types
// from the `vine.proto` file.
import type { MountainService } from "../Generated.js";

/**
 * The service interface for the raw, generated gRPC client.
 *
 * Higher-level IPC services will use this client to make calls to `Mountain`.
 */
export type Interface = MountainService;

/**
 * The `Context.Tag` for the gRPC client service.
 *
 * This tag is used by other services to declare their dependency on the raw
 * gRPC client.
 */
export const Tag = Context.Tag<Interface>("IPC/Client");
