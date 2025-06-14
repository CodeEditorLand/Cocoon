/**
 * @module Live (WorkSpace)
 * @description The live implementation Layer for the WorkSpace service.
 */

import { Layer } from "effect";

import ConfigurationLive from "../Configuration/Live.js";
import DocumentLive from "../Document/Live.js";
import FileSystemLive from "../FileSystem/Live.js";
import type IPCConfiguration from "../IPC/Configuration.js";
import IPCLive from "../IPC/Live.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the WorkSpace service.
 * @param Config The IPC Configuration.
 */
export default function (Config: {
	MountainAddress: string;
	CocoonAddress: string;
}) {
	return Layer.effect(Service, Definition).pipe(
		Layer.provide(
			Layer.mergeAll(
				IPCLive(Config),
				DocumentLive(Config),
				FileSystemLive(Config),
				ConfigurationLive(Config),
			),
		),
	);
}
