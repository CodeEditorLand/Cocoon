/*
 * File: Cocoon/Source/Core/HostKindPicker/Live.ts
 * Responsibility: Implements the live layer for the HostKindPicker service using Effect's Layer, declaring its dependency on the Log service to facilitate environment-specific configuration within the Cocoon sidecar.
 * Modified: 2025-06-17 21:19:40 UTC
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
