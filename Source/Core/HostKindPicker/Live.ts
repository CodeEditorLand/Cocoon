/*
 * File: Cocoon/Source/Core/HostKindPicker/Live.ts
 * Responsibility: This module provides the `Live` implementation Layer for the HostKindPicker service.
 * Modified: 2025-06-17 10:52:55 UTC
 * Dependency: ../../Service/Log/Service.js, ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (HostKindPicker)
 * @description This module provides the `Live` implementation Layer for the HostKindPicker service.
 */

import { Layer } from "effect";

import type LogService from "../../Service/Log/Service.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the HostKindPicker service.
 * It correctly declares its dependency on the Log service.
 */
const Live: Layer.Layer<Service, never, LogService> = Layer.effect(
	Service,
	Definition,
);

export default Live;
