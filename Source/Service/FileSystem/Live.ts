/*
 * File: Cocoon/Source/Service/FileSystem/Live.ts
 * Responsibility:
 * Modified: 2025-06-16 14:45:21 UTC
 * Dependency: ../FileSystemInformation.js, ../IPC.js, ../IPC/Configuration.js, ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (FileSystem)
 * @description This module provides the `Live` implementation Layer for the FileSystem service.
 */

import { Layer } from "effect";

import { Live as FileSystemInformationLive } from "../FileSystemInformation.js";
import { Live as IPCLive } from "../IPC.js";
import { type IPCConfiguration } from "../IPC/Configuration.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the FileSystem service.
 * It depends on the IPC and FileSystemInformation services.
 * @param Config The IPC configuration.
 */
const Live = (Config: IPCConfiguration) =>
	Layer.effect(Service, Definition).pipe(
		Layer.provide(
			Layer.merge(IPCLive(Config), FileSystemInformationLive(Config)),
		),
	);

export default Live;
