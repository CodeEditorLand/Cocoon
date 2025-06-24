/**
 * @module WorkSpace
 * @description Defines a stubbed `Effect` for resolving the workspace settings path.
 * This file is a placeholder to resolve import errors.
 */

import { Effect } from "effect";
import type { Uri } from "vscode";

export const ResolveWorkSpacePath = (): Effect.Effect<Uri, any> => {
	return Effect.fail(
		new Error("ResolveWorkSpacePath integration is a stub."),
	);
};
