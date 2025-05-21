// Assuming fs-shim exports promises under a default or named export
import * as mockFsPromises from "./fs-shim";
// Assuming process-shim exports pid, kill
import * as mockProcess from "./process-shim";

// Define the IHostUtils interface based on its usage.
// This would ideally come from VS Code's platform services.
export interface IHostUtils {
	readonly _serviceBrand: undefined;

	// pid might be optional or always present depending on the real interface
	readonly pid?: number;

	exit(code: number): void;

	fsExists(path: string): Promise<boolean>;

	fsRealpath(path: string): Promise<string>;
}

export class ShimHostUtils implements IHostUtils {
	public readonly _serviceBrand: undefined;

	constructor() {
		// No specific dependencies mentioned in the original JS for the constructor
	}

	public get pid(): number | undefined {
		// mockProcess should export pid directly if it's mimicking Node's process
		return mockProcess.pid;
	}

	public exit(code: number): void {
		console.warn(`[Cocoon Shim] HostUtils.exit(${code}) called, ignoring.`);

		// In a real host, this would terminate the process.
		// The shim explicitly ignores it.
	}

	public fsExists(path: string): Promise<boolean> {
		// fs-shim.ts default exports an object that has a 'promises' property
		return mockFsPromises.default.promises
			.stat(path)
			.then(() => true)
			.catch(() => false);
	}

	public fsRealpath(path: string): Promise<string> {
		// fs-shim.ts default exports an object that has a 'promises' property
		return mockFsPromises.default.promises.realpath(path);
	}
}

// Original JS export
// module.exports = { ShimHostUtils };

// `export class ...` handles this in TS.
