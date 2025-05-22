/*---------------------------------------------------------------------------------------------
 * Cocoon Crypto Shim (crypto-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a shim for Node.js's built-in 'crypto' module.
 * For most common and safe operations (hashing, HMAC, random bytes/UUID), it
 * delegates directly to the native Node.js 'crypto' module.
 *
 * This shim is intended to be provided by the `NodeModuleShimFactory` when an
 * extension executes `require('crypto')`.
 *
 * More sensitive or platform-dependent crypto operations (e.g., those requiring
 * system-specific key stores or entropy sources not directly available/trusted
 * in the Cocoon environment) would need to be proxied to Mountain if required.
 * Currently, no operations are proxied.
 *
 * Key Interactions:
 * - Returned by `NodeModuleShimFactory`.
 * - Delegates to `node:crypto`.
 * - TODO: Could use `sendToMountainAndWait` from `cocoon-ipc.ts` for proxied operations.
 *--------------------------------------------------------------------------------------------*/

import * as nodeCrypto from "node:crypto";
// For type information from @types/node
import type * as NodeCryptoTypes from "node:crypto";

// Uncomment if proxying is implemented
// import { sendToMountainAndWait } from "../cocoon-ipc";

// --- Type Definitions ---

// Define the shape of the shim to match relevant parts of Node.js 'crypto' module.
// TODO: If @types/node is a dev dependency, this interface should ideally align with or utilize types from `typeof nodeCrypto`.
// For functions proxied to Mountain, their signatures (especially return types if async) would differ.
export interface CocoonCryptoShim {
	// Directly from node:crypto
	createHash: typeof nodeCrypto.createHash;

	createHmac: typeof nodeCrypto.createHmac;

	randomBytes: (
		size: number,

		callback?: (err: Error | null, buf: Buffer) => void,

		// Ensure signature matches
	) => Buffer;

	// Newer Node.js, web crypto like
	getRandomValues?: typeof nodeCrypto.getRandomValues;

	randomUUID: typeof nodeCrypto.randomUUID;

	// TODO: Add other commonly used, safe crypto functions if needed by extensions or VS Code platform code, e.g.:
	// timingSafeEqual: typeof nodeCrypto.timingSafeEqual;

	// getHashes: typeof nodeCrypto.getHashes;

	// getCiphers: typeof nodeCrypto.getCiphers;

	// Node crypto constants
	// constants: typeof nodeCrypto.constants;

	// Example of a proxied function (if needed)
	// generateKeyPairProxied?(
	//    type: 'rsa' | 'dsa' | 'ec' | /* ...other key types */ string,

	// NodeCryptoTypes.GenerateKeyPairKeyObjectOptions | NodeCryptoTypes.GenerateKeyPairStringOptions
	//    options: any
	// ): Promise<{ publicKey: string | Buffer; privateKey: string | Buffer }>;
}

const cryptoShimInstance: CocoonCryptoShim = {
	// Functions delegated directly to Node.js's crypto module:
	createHash: nodeCrypto.createHash,

	createHmac: nodeCrypto.createHmac,

	// nodeCrypto.randomBytes has an overloaded signature:
	// randomBytes(size: number): Buffer;

	// randomBytes(size: number, callback: (err: Error | null, buf: Buffer) => void): void;

	// The shim should try to match this if extensions use the callback version.
	// For simplicity, if only the sync version is expected by extensions in Cocoon:
	randomBytes: (
		size: number,

		callback?: (err: Error | null, buf: Buffer) => void,
	): Buffer => {
		if (callback) {
			// Node's behavior for the callback version:
			try {
				const buf = nodeCrypto.randomBytes(size);

				// Defer callback to next tick to mimic async nature for callback users
				process.nextTick(() => callback(null, buf));
			} catch (err: any) {
				// Pass empty buffer on error
				process.nextTick(() => callback(err, Buffer.alloc(0)));
			}

			// The void return for callback version is tricky.
			// This implementation returns Buffer always, which is not quite right for callback version.
			// TODO: Properly shim the overloaded randomBytes if callback version is used.
			// For now, this primarily supports the synchronous `const buf = crypto.randomBytes(16);`
			// If callback provided, this line's return is ignored by caller.
			return nodeCrypto.randomBytes(size);
		}

		// Synchronous version
		return nodeCrypto.randomBytes(size);
	},

	// randomUUID is available in Node.js v14.17.0+ (LTS Gallium) and v15.6.0+.
	// Ensure Cocoon's target Node.js version supports this.
	randomUUID: nodeCrypto.randomUUID,

	// getRandomValues is part of Web Crypto API and also in Node's crypto since v15.0.0 / v14.17.0
	// nodeCrypto.getRandomValues might not exist in older Node versions targeted by some VS Code code.
	// Provide it if available, otherwise it will be undefined on the shim.
	getRandomValues: nodeCrypto.getRandomValues,

	// Pass through constants
	// constants: nodeCrypto.constants,

	// Example of a function that *might* need proxying if it involved system specifics.
	// This would typically be for operations that require access to system-level key stores,

	// specific hardware modules, or if Cocoon's environment has insufficient/untrusted entropy.
	// generateKeyPairProxied: async (type: string, options: any) => {

	//    console.warn("[Cocoon Crypto Shim] generateKeyPairProxied - proxying to Mountain (example)");

	// TODO: Ensure sendToMountainAndWait is imported and types match.
	//
	// return sendToMountainAndWait('crypto_generateKeyPair', { type, options }, 10000);

	//
	//    throw new Error("generateKeyPairProxied is not implemented in crypto-shim");

	// }
};

// Default export for easy import via `import cryptoShim from './crypto-shim';`
// This is consumed by NodeModuleShimFactory.
export default cryptoShimInstance;
