/**
 * @module State (ExtensionHost)
 * @description Defines the internal state representation for an activated extension.
 */

import { ExtensionIdentifier } from "vs/platform/extensions/common/extensions.js";
import type * as VSCode from "vscode";

/**
 * Represents the complete state of an extension after it has been loaded and activated.
 */
export interface ActivatedExtension {
	readonly Id: ExtensionIdentifier;
	readonly Module: { activate?: Function; deactivate?: Function };
	readonly Exports: any;
	readonly Subscriptions: VSCode.Disposable[];
	readonly ActivationFailed: boolean;
	readonly ActivationError: Error | null;
}
