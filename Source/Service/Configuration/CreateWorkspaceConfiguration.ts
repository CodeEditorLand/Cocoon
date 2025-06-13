/**
 * @module CreateWorkSpaceConfiguration
 * @description A factory function that creates the `vscode.WorkSpaceConfiguration`
 * object that extensions interact with.
 */

import { Effect } from "effect";
import { deepClone } from "vs/base/common/objects.js";
import type { ConfigurationTarget } from "vscode";

import type { IPC } from "../IPC.js";
import type { Log } from "../Log.js";
import type { WorkSpaceConfiguration } from "./Type.js";

export const CreateWorkSpaceConfiguration = (
	Snapshot: any,
	SectionPrefix: string,
	IPCService: IPC.Interface,
	LogService: Log.Interface,
): WorkSpaceConfiguration => {
	const get = <T>(key: string, defaultValue?: T): T | undefined => {
		// Traverse the object path to get the value.
		const value = key
			.split(".")
			.reduce((acc, part) => acc?.[part], Snapshot);
		return value !== undefined ? deepClone(value) : defaultValue;
	};

	const update = (
		key: string,
		value: any,
		target?: ConfigurationTarget | boolean,
		overrideInLanguage?: boolean,
	) => {
		const updateEffect = IPCService.SendNotification(
			"$updateConfigurationOption",
			[target, `${SectionPrefix}.${key}`, value, overrideInLanguage],
		).pipe(
			Effect.tapError((err) =>
				LogService.Error(
					`Configuration update for key '${key}' failed.`,
					err,
				),
			),
		);
		// The vscode API for update is fire-and-forget, so we fork the effect.
		return Effect.runPromise(updateEffect);
	};

	return {
		get,
		has: (key: string) => get(key) !== undefined,
		inspect: <T>(key: string) => {
			// A real implementation would make an RPC call to Mountain's ConfigInspector.
			return Promise.resolve(undefined as any);
		},
		update,
	};
};
