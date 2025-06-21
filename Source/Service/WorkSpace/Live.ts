/**
 * @module Live (WorkSpace)
 * @description The live implementation Layer for the WorkSpace service.
 */

import { Layer } from "effect";

import ConfigurationService from "../Configuration/Service.js";
import DocumentService from "../Document/Service.js";
import FileSystemService from "../FileSystem/Service.js";
import IPCService from "../IPC/Service.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the WorkSpace service.
 */
const Live: Layer.Layer<
	Service,
	never,
	IPCService | DocumentService | FileSystemService | ConfigurationService
> = Layer.effect(Service, Definition);

export default Live;
