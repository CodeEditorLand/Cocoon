/**
 * @module ProcessPatch
 * @description This module defines the service that provides the necessary native
 * functions and configuration for the other process patching Effects. It serves
 * as the public entry point for the ProcessPatch service.
 */

import Live from "./ProcessPatch/Live.js";
import Service from "./ProcessPatch/Service.js";

export { Service, Live };
