/*
 * File: Cocoon/Source/Core/ESMInterceptor/Live.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:53:05 UTC
 * Dependency: ../../Service/Log/Live.js, ../APIFactory/Live.js, ../ExtensionPath/Live.js, ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (ESMInterceptor)
 * @description The live implementation layer for the ESMInterceptor service.
 */

import { Layer } from "effect";

import LogLive from "../../Service/Log/Live.js";
import APIFactoryLive from "../APIFactory/Live.js";
import ExtensionPathLive from "../ExtensionPath/Live.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation layer for the ESMInterceptor service.
 * It depends on the APIFactory, ExtensionPath, and logging services.
 */
export default Layer.effect(Service, Definition).pipe(
	Layer.provide(Layer.mergeAll(APIFactoryLive, ExtensionPathLive, LogLive)),
);
