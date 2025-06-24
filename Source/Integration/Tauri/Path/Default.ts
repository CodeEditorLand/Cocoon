/**
 * @module Default
 * @description Defines a stubbed `Effect` for resolving the default settings path.
 * This file is a placeholder to resolve import errors.
 */

import { Effect } from "effect";
import type { Uri } from "vscode";

export const ResolveFinalDefaultPath = (): Effect.Effect<Uri, any> => {
	return Effect.fail(
		new Error("ResolveFinalDefaultPath integration is a stub."),
	);
};
