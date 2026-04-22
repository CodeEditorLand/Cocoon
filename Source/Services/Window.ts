/**
 * @module Services/Window
 * @description
 * Re-export shim — implementation has been split into Window/ directory.
 *
 * All types, interfaces, and the WindowService class are re-exported from
 * the modular Window/ directory. Import directly from the sub-modules or
 * from this shim; both paths resolve identically.
 */

export { default } from "./Window/Index.js";
export {
	WindowService,
	Logger,
	Window,
	Workspace,
	VSCodeWindowAPI,
} from "./Window/Index.js";
