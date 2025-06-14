/**
 * @module ConfigurationUpdateError (Configuration/Error)
 * @description Defines custom, tagged errors for the Configuration service.
 */

import { Data } from "effect";

/**
 * An error indicating that an attempt to update a configuration value failed.
 * This could be due to permission issues, invalid values, or IPC failures.
 */
export default class extends Data.TaggedError("ConfigurationUpdateError")<{
	readonly key: string;
	readonly cause: unknown;
}> {
	override get message() {
		return `Failed to update configuration for key '${this.key}'.`;
	}
}
