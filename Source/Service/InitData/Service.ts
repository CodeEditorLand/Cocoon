/*
 * File: Cocoon/Source/Service/InitData/Service.ts
 * Responsibility:
 * Modified: 2025-06-15 19:17:03 UTC
 * Dependency: effect, vs/workbench/services/extensions/common/extensionHostProtocol.js
 * Export: InitDataService
 */

/**
 * @module Service (InitData)
 * @description Defines the interface and Context.Tag for the InitData service.
 * This is a simple value service that holds the initial data payload sent from
 * the Mountain host process upon startup.
 */

import { Context } from "effect";
import type { IExtensionHostInitData } from "vs/workbench/services/extensions/common/extensionHostProtocol.js";

/**
 * The Context.Tag for the InitData service. Other services will use this Tag
 * to declare their dependency on the initial host configuration data.
 */
export default class InitDataService extends Context.Tag("Service/InitData")<
	InitDataService,
	IExtensionHostInitData
>() {}
