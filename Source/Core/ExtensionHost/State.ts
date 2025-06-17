/*
 * File: Cocoon/Source/Core/ExtensionHost/State.ts
 * Responsibility: Responsibility could not be determined.
 * Modified: 2025-06-17 10:52:54 UTC
 * Dependency: vs/platform/extensions/common/extensions.js, vscode
 * Export: ActivatedExtension
 */

/**
 * @module State (ExtensionHost)
 * @description Defines the internal state representation for an activated extension.
 * This interface holds all the relevant information about an extension after its
 * `activate()` function has been successfully called.
 */

import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

/**
 * Represents the complete state of an extension after it has been loaded and activated.
 */
export interface ActivatedExtension {
	/** The unique identifier of the extension. */
	readonly ID: ExtensionIdentifier;
	/** The loaded Node.js module object. */
	readonly Module: {
		readonly activate?: Function;
		readonly deactivate?: Function;
	};
	/** The value returned by the `activate` function. */
	readonly Exports: any;
	/** The `vscode.Disposable` objects from the extension's context subscriptions. */
	readonly Subscriptions: readonly VSCode.Disposable[];
	/** A flag indicating if the activation process failed. */
	readonly ActivationFailed: boolean;
	/** The error object if activation failed. */
	readonly ActivationError: Error | null;
}
