/*
 * File: Cocoon/Source/Service/IPC/Client/Service.ts
 *
 * This file defines the service interface and `Context.Tag` for the low-level
 * gRPC client that communicates from Cocoon to the `Mountain` backend.
 */

import { Context } from "effect";

import type { MountainService } from "../Generated.js";

/**
 * The `Context.Tag` for the gRPC client service.
 *
 * This tag is used by other services to declare their dependency on the raw
 * gRPC client.
 */
export default class ClientService extends Context.Tag("IPC/Client")<
	ClientService,
	MountainService
>() {}
