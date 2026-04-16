/**
 * @module Services/InitData
 * @description Extension host initialization data service tag.
 */

import { Context, Effect, Layer } from "effect";

export interface InitData {
	readonly commit: string;
	readonly version: string;
	readonly parentPid: number;
	readonly extensions: ReadonlyArray<unknown>;
	readonly workspace: unknown;
	readonly environment: Record<string, unknown>;
}

export class InitDataService extends Context.Tag("Cocoon/InitData")<
	InitDataService,
	InitData
>() {}

export const InitDataLive = Layer.succeed(InitDataService, {
	commit: "dev",
	version: "0.0.1",
	parentPid: process.pid,
	extensions: [],
	workspace: null,
	environment: {},
});

export default InitData;
