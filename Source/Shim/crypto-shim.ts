/*---------------------------------------------------------------------------------------------
 // Header: Added a basic header. 
* Cocoon Crypto Shim (crypto-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a shim for Node.js's built-in 'crypto' module.
 * For most operations, it delegates directly to the native Node.js 'crypto' module.
 * It includes a placeholder for proxying specific crypto operations to Mountain if needed,
 * for example, operations requiring system-specific resources or entropy sources not
 * directly available/trusted in the Cocoon environment.
 *
 * Key Interactions:
 * - Returned by `NodeModuleShimFactory` when `require('crypto')` is intercepted.
 * - Primarily uses `node:crypto`.
 * - Can use `sendToMountainAndWait` from `cocoon-ipc.ts` for proxied operations.
 *--------------------------------------------------------------------------------------------*/

import * as nodeCrypto from "node:crypto";

// Uncomment if proxying is implemented
// import { sendToMountainAndWait } from "../cocoon-ipc";

// --- Type Definitions ---

// Define the shape of the shim to match relevant parts of Node.js 'crypto' module.
// This makes the shim's exports more explicit and type-safe.
// TODO: Expand this interface as more crypto functions are shimmed or proxied.
export interface CocoonCrypto {
	// From node:crypto
	createHash: typeof nodeCrypto.createHash;
	createHmac: typeof nodeCrypto.createHmac;
	randomBytes: typeof nodeCrypto.randomBytes;
	randomUUID: typeof nodeCrypto.randomUUID;
	// TODO: Add types for other commonly used crypto functions if they are to be exposed, e.g.,
	// pbkdf2: typeof nodeCrypto.pbkdf2;
	// If using Node's directly
	// generateKeyPair: typeof nodeCrypto.generateKeyPair;
	// Or a proxied version:
	// generateKeyPairProxied?(
	//    type: string,
	//    options: any,
	// ): Promise<{ publicKey: string | Buffer; privateKey: string | Buffer }>;
}

const cryptoShimInstance: CocoonCrypto = {
	// Functions likely safe to run directly in Cocoon's Node.js environment
	createHash: nodeCrypto.createHash,
	createHmac: nodeCrypto.createHmac,
	randomBytes: nodeCrypto.randomBytes,

	// randomUUID is available in Node.js v14.17.0+ and v15.6.0+.
	// Ensure Cocoon's Node.js version supports this.
	randomUUID: nodeCrypto.randomUUID,

	// Example of a function that *might* need proxying if it involved system specifics
	// not suitable for direct execution in Cocoon.
	// generateKeyPairProxied: async (type: string, options: any) => {
	//    console.warn("[Cocoon Crypto Shim] generateKeyPairProxied - proxying to Mountain (example)");
	// TODO: Ensure sendToMountainAndWait is imported and types match.
	//
	// return sendToMountainAndWait('crypto_generateKeyPair', { type, options }, 5000);
	//
	// For now, this is a placeholder:
	//
	//    throw new Error("generateKeyPairProxied is not implemented");
	// }

	// TODO: Add other functions from 'node:crypto' as needed by extensions.
	// For each function, decide whether to:
	// 1. Delegate directly to `nodeCrypto.<functionName>`.
	// 2. Implement a proxied version using `sendToMountainAndWait`.
	// 3. Omit it if not required or too risky to expose directly.
};

// Default export for easy import via `import cryptoShim from './crypto-shim';`
// This matches the pattern used by NodeModuleShimFactory.
export default cryptoShimInstance;

// Alternatively, if individual named exports are preferred to exactly mimic `require('crypto')`:
// export const createHash = cryptoShimInstance.createHash;
// export const createHmac = cryptoShimInstance.createHmac;
// export const randomBytes = cryptoShimInstance.randomBytes;
// export const randomUUID = cryptoShimInstance.randomUUID;
// This alternative makes usage like `import { createHash } from './crypto-shim';` possible.
// However, the factory likely expects a single module object.
