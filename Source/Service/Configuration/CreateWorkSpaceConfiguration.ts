/*
 * File: Cocoon/Source/Service/Configuration/CreateWorkSpaceConfiguration.ts
 * Responsibility: 
 * Modified: 2025-06-15 21:13:19 UTC
 * Dependency: ../IPC/Service.js, ../Log/Service.js, effect, vs/base/common/objects.js, vs/workbench/api/common/extHostConfiguration.js, vscode
 */

/**
 * @module CreateWorkSpaceConfiguration
 * @description A factory function that creates the `vscode.WorkSpaceConfiguration`
 * object that extensions interact with. This object is a proxy that reads from
 * a snapshot of settings and writes changes back to the host via IPC.
 */

import { Effect } from "effect";
import { deepClone } from "vs/base/common/objects.js";
import type { ConfigurationInspect } from "vs/workbench/api/common/extHostConfiguration.js";
import type { ConfigurationTarget, WorkspaceConfiguration } from "vscode";

import type IPCService from "../IPC/Service.js";
import type LogService from "../Log/Service.js";

const CreateWorkSpaceConfiguration = (
	Snapshot: any,
	SectionPrefix: string,
	IPC: IPCService["Type"],
	Log: LogService["Type"],
): WorkspaceConfiguration => {
	const Get = <T>(Key: string, DefaultValue?: T): T | undefined => {
		// Traverse the object path to get the value.
		const Value = Key.split(".").reduce(
			(Accumulator, Part) => Accumulator?.[Part],
			Snapshot,
		);
		return Value !== undefined ? deepClone(Value) : DefaultValue;
	};

	const Update = (
		Key: string,
		Value: any,
		Target?: ConfigurationTarget | boolean,
		OverrideInLanguage?: boolean,
	): Promise<void> => {
		const UpdateEffect = IPC.SendNotification(
			"$updateConfigurationOption",
			[Target, `${SectionPrefix}.${Key}`, Value, OverrideInLanguage],
		).pipe(
			Effect.tapError((ErrorValue) =>
				Log.Error(
					`Configuration update for key '${Key}' failed.`,
					ErrorValue,
				),
			),
			Effect.asVoid,
		);
		// The vscode API for update is fire-and-forget, so we run and return a promise.
		return Effect.runPromise(UpdateEffect);
	};

	return {
		get: Get,
		has: (Key: string) => Get(Key) !== undefined,
		inspect: <T>(Key: string): ConfigurationInspect<T> | undefined => {
			// A real implementation would make an RPC call to Mountain to get the full
			// configuration details (globalValue, workspaceValue, etc.).
			const Value = Get<T>(Key);
			return {
				key: Key,
				defaultValue: Value,
				globalValue: Value,
				workspaceValue: Value,
				workspaceFolderValue: Value,
			};
		},
		update: Update,
	};
};

export default CreateWorkSpaceConfiguration;
