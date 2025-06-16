/*
 * File: Cocoon/Source/Core/HostKindPicker/Live.ts
 * Responsibility: 
 * Modified: 2025-06-15 19:17:21 UTC
 * Dependency: ../../Service/Log.js, ./Definition.js, ./Service.js, effect
 */

/**
 * @module Live (HostKindPicker)
 * @description This module provides the `Live` implementation Layer for the HostKindPicker service.
 */

import { Layer } from "effect";

import { Live as LogLive } from "../../Service/Log.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the HostKindPicker service.
 * It depends on the Log service for reporting its decisions.
 */
const Live = Layer.effect(Service, Definition).pipe(Layer.provide(LogLive));

export default Live;
