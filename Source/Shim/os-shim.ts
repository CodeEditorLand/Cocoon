// Basic OS shim - can provide some constants directly, proxy others
// Get access to Node's REAL os module for constants and fallbacks
import * as nodeOs from "node:os";

// Assuming typed: (method: string, params: any, timeout?: number) => Promise<any>
import { sendToMountainAndWait } from "..";

// Define the shape of the os shim based on Node.js os module
// This is a subset; a full os module has many more functions.
export interface OsShim {
	EOL: string;

	// Use NodeJS.Platform for better type safety
	platform(): NodeJS.Platform;

	arch(): string;

	// Assuming this will be proxied and async
	hostname(): Promise<string>;

	homedir(): string;

	tmpdir(): string;

	constants: typeof nodeOs.constants;

	// Add other common os functions if needed by extensions, e.g.:
	// e.g., 'Linux', 'Darwin', 'Windows_NT'
	// type(): string;

	// release(): string;

	// totalmem(): number;

	// freemem(): number;

	// cpus(): nodeOs.CpuInfo[];

	// networkInterfaces(): NodeJS.Dict<nodeOs.NetworkInterfaceInfo[]>;

	// userInfo(options?: { encoding: BufferEncoding }): nodeOs.UserInfo<string>;

	// userInfo(options: { encoding: 'buffer' }): nodeOs.UserInfo<Buffer>;
}

const osShimInstance: OsShim = {
	// Constant likely safe
	EOL: nodeOs.EOL,

	// Node's process.platform is usually fine
	platform: (): NodeJS.Platform => process.platform,

	// Node's process.arch is usually fine
	arch: (): string => process.arch,

	// Proxy things that might need real OS info from Mountain
	hostname: async (): Promise<string> => {
		try {
			return await sendToMountainAndWait("os_hostname", {}, 1000);
		} catch (error: any) {
			console.error(
				"[Cocoon OS Shim] Failed to get hostname from Mountain, falling back to Node's os.hostname()",

				error,
			);

			// Fallback to Node's os.hostname() if IPC fails, though this might not be the "Mountain" view.
			try {
				return nodeOs.hostname();
			} catch (nodeError: any) {
				console.error(
					"[Cocoon OS Shim] Fallback nodeOs.hostname() also failed",

					nodeError,
				);

				// Ultimate fallback
				return "localhost";
			}
		}
	},

	homedir: (): string => {
		// Get from env if possible, fallback to Node's os.homedir()
		return (
			process.env.HOME ||
			process.env.USERPROFILE ||
			nodeOs.homedir() ||
			""
		);
	},

	tmpdir: (): string => {
		// Node's tmpdir might be okay? Or proxy? For shim, Node's is usually sufficient.
		try {
			return nodeOs.tmpdir();
		} catch (e) {
			console.warn(
				"[Cocoon OS Shim] nodeOs.tmpdir() failed, returning fallback /tmp. Error:",

				e,
			);

			// Common fallback, adjust if needed
			return "/tmp";
		}
	},

	// Pass constants through
	constants: nodeOs.constants,

	// --- Examples of other OS functions (implement or proxy as needed) ---
	// type: (): string => {

	// Could be proxied: return sendToMountainAndWait("os_type", {}, 500);

	//
	// Or use Node's:
	//
	//     return nodeOs.type();

	// },

	// release: (): string => nodeOs.release(),

	// totalmem: (): number => nodeOs.totalmem(),

	// freemem: (): number => nodeOs.freemem(),

	// cpus: (): nodeOs.CpuInfo[] => nodeOs.cpus(),

	// networkInterfaces: (): NodeJS.Dict<nodeOs.NetworkInterfaceInfo[]> => nodeOs.networkInterfaces(),

	// userInfo: (options?: { encoding?: BufferEncoding | 'buffer' }): nodeOs.UserInfo<string> | nodeOs.UserInfo<Buffer> => {

	// Be careful with options type for overloaded functions
	//
	//     if (options && (options as { encoding: 'buffer' }).encoding === 'buffer') {

	//         return nodeOs.userInfo({ encoding: 'buffer' });

	//     }
	//     return nodeOs.userInfo(options as { encoding: BufferEncoding } | undefined);

	// }
};

export default osShimInstance;

// Original JS export
// module.exports = { ... }
// `export default ...` handles this in TS.
