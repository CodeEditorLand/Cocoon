/**
 * @module InitData
 * @description This module provides the InitData service, a value service that
 * holds the initial data sent from the Mountain host process. This data is
 * essential for bootstrapping many other services.
 */

export { Live } from "./InitData/Live.js";
export { Tag, type Interface } from "./InitData/Service.js";
