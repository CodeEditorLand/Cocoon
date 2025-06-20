

import { Layer } from "effect";

import FileSystemService from "../FileSystem/Service.js";
import InitDataService from "../InitData/Service.js";
import LogService from "../Log/Service.js";
import Definition from "./Definition.js";
import Service from "./Service.js";

/**
 * The live implementation Layer for the StoragePath service.
 * It depends on the FileSystem, Log, and InitData services.
 */
const Live: Layer.Layer<
	Service,
	never,
	InitDataService | LogService | FileSystemService
> = Layer.effect(Service, Definition);

export default Live;
