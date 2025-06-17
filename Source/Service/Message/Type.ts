/*
 * File: Cocoon/Source/Service/Message/Type.ts
 * Responsibility:
 * Modified: 2025-06-17 21:19:16 UTC
 * Dependency: vs/platform/extensions/common/extensions.js
 * Export: Interface
 */

/**
 * @module Type (Message)
 * @description Defines types used by the Message service, such as the
 * structure for identifying the source of a message.
 */

import type { ExtensionIdentifier } from "vs/platform/extensions/common/extensions.js";

/**
 * An interface to identify the source of a message, typically an extension.
 * This is used by the host to display the source in the notification UI.
 */
export default interface Interface {
	/**
	 * The identifier of the extension.
	 */
	readonly id: string | ExtensionIdentifier;
	/**
	 * The display name of the extension.
	 */
	readonly displayName: string;
}
