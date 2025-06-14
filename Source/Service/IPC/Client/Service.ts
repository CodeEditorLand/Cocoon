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
 * The `Context.Tag` for the gRPC client service.
 *
 * This tag is used by other services to declare their dependency on the raw
 * gRPC client.
 */
export default class extends Context.Tag("IPC/Client")<
	any,
	MountainService
>() {}
