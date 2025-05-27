/*---------------------------------------------------------------------------------------------
 * Cocoon Crypto Shim (crypto-shim.ts)
 * --------------------------------------------------------------------------------------------
 * Provides a shim for Node.js's built-in 'crypto' module. This shim is intended to be
 * supplied by the `NodeModuleShimFactory` when an extension executes `require('crypto')`.
 *
 * The primary goal is to offer a controlled and safe subset of the native 'crypto'
 * module's capabilities. For most common and generally secure cryptographic operations
 * (such as hashing, HMAC, random byte generation, UUID creation, PBKDF2, random fill,
 *
 * and various getters for supported algorithms), this shim delegates directly to the
 * native Node.js 'crypto' module available in the Cocoon environment.
 *
 * Operations deemed more sensitive, platform-dependent, or those that might require
 * access to system-level key stores or entropy sources not directly available/trusted
 * in a sandboxed Cocoon environment, are currently NOT implemented for proxying to the
 * Mountain host. Placeholders or stubs might exist for such functions, indicating
 * they would require an IPC mechanism if their functionality were needed.
 *
 * Responsibilities:
 * - Mimicking the interface of the Node.js 'crypto' module for a curated set of
 *   commonly used and safe functions.
 * - Delegating these safe operations directly to the corresponding methods in `node:crypto`.
 * - Correctly handling the overloaded signature of `crypto.randomBytes` (synchronous
 *   and asynchronous callback-based versions) and `crypto.randomFill`.
 * - Exposing Node.js `crypto.constants`.
 * - Providing clear stubs or placeholders for crypto operations that are not currently
 *   supported or would require proxying to Mountain.
 *
 * Key Interactions:
 * - An instance of this shim is returned by `NodeModuleShimFactory` when an extension
 *   issues `require('crypto')`.
 * - It directly utilizes the `node:crypto` module from the Node.js runtime environment
 *   in which Cocoon operates.
 * - (Future) If any operations were proxied, it would use `sendToMountainAndWait` from
 *   `../cocoon-ipc.ts`.
 *
 *--------------------------------------------------------------------------------------------*/

import * as nodeCrypto from "node:crypto";
// For type information from @types/node, assuming it's a dev dependency for accurate types.
import type * as NodeCryptoTypes from "node:crypto";

// Uncomment if proxying is implemented in the future:
// import { sendToMountainAndWait } from "../cocoon-ipc";

// --- Type Definitions ---

/**
 * Defines the public interface of the Cocoon crypto shim.
 * This interface aims to match relevant and commonly used parts of the Node.js 'crypto' module API,
 *
 * focusing on operations that are generally safe to expose directly from the Cocoon environment.
 */
export interface CocoonCryptoShim {
	/** @see {@link nodeCrypto.createHash} */
	createHash: typeof nodeCrypto.createHash;

	/** @see {@link nodeCrypto.createHmac} */
	createHmac: typeof nodeCrypto.createHmac;

	/**
	 * Generates cryptographically strong pseudo-random data.
	 * Supports both synchronous invocation (returns a `Buffer`) and asynchronous
	 * invocation (takes a callback).
	 * @see {@link nodeCrypto.randomBytes}
	 *
	 */
	// Node.js signature handles overloads
	randomBytes: typeof nodeCrypto.randomBytes;

	/**
	 * Fills the provided `TypedArray` with cryptographically strong random values.
	 * Available in Node.js v15.0.0+ / v14.17.0+. Will be `undefined` if not supported.
	 * @see {@link nodeCrypto.getRandomValues}
	 *
	 */
	getRandomValues: typeof nodeCrypto.getRandomValues;

	/**
	 * Generates a random RFC 4122 version 4 UUID.
	 * Available in Node.js v15.6.0+ / v14.17.0+.
	 * @see {@link nodeCrypto.randomUUID}
	 *
	 */
	randomUUID: typeof nodeCrypto.randomUUID;

	/**
	 * Asynchronously fills `buffer` with cryptographically strong pseudo-random data.
	 * Supports both callback and Promise-based asynchronous invocation.
	 * @see {@link nodeCrypto.randomFill}
	 *
	 */
	// Node.js signature handles overloads
	randomFill: typeof nodeCrypto.randomFill;

	/**
	 * Synchronously fills `buffer` with cryptographically strong pseudo-random data.
	 * @see {@link nodeCrypto.randomFillSync}
	 *
	 */
	randomFillSync: typeof nodeCrypto.randomFillSync;

	/**
	 * Asynchronously derives a key from a password, salt, and iterations.
	 * @see {@link nodeCrypto.pbkdf2}
	 *
	 */
	pbkdf2: typeof nodeCrypto.pbkdf2;

	/**
	 * Synchronously derives a key from a password, salt, and iterations.
	 * @see {@link nodeCrypto.pbkdf2Sync}
	 *
	 */
	pbkdf2Sync: typeof nodeCrypto.pbkdf2Sync;

	/** Exposes Node.js crypto constants. @see {@link nodeCrypto.constants} */
	constants: typeof nodeCrypto.constants;

	/** Performs a timing-safe equality comparison of two Buffers. @see {@link nodeCrypto.timingSafeEqual} */
	timingSafeEqual: typeof nodeCrypto.timingSafeEqual;

	/** Returns an array of the names of the supported hash algorithms. @see {@link nodeCrypto.getHashes} */
	getHashes: typeof nodeCrypto.getHashes;

	/** Returns an array of the names of the supported cipher algorithms. @see {@link nodeCrypto.getCiphers} */
	getCiphers: typeof nodeCrypto.getCiphers;

	// --- Stubs for potentially sensitive or complex operations not yet proxied/implemented ---

	/**
	 * (STUBBED - Throws Not Implemented) Asynchronously generates a new random prime number of the given `size` in bits.
	 * Requires careful consideration for proxying due to potential performance and security aspects.
	 */
	generatePrime: typeof nodeCrypto.generatePrime;

	/**
	 * (STUBBED - Throws Not Implemented) Asynchronously generates a new key pair of the given `type`.
	 * Requires proxying to Mountain if keys need to be system-managed or for hardware security modules.
	 */
	generateKeyPair: typeof nodeCrypto.generateKeyPair;

	// generateKeyPairSync is also typically available.
}

/**
 * The singleton instance of the Cocoon crypto shim, implementing `CocoonCryptoShim`.
 */
const cryptoShimInstance: CocoonCryptoShim = {
	// Direct delegations to the native node:crypto module:
	createHash: nodeCrypto.createHash,

	createHmac: nodeCrypto.createHmac,

	// Node.js `randomBytes` itself correctly handles both sync and async (callback) overloads.
	// The callback version is truly async in Node.js.
	randomBytes: nodeCrypto.randomBytes,

	// `getRandomValues` is available if Node version supports it (Node >=14.17.0 / >=15.0.0).
	// If not, `nodeCrypto.getRandomValues` will be undefined, and so will this shim's property.
	getRandomValues: nodeCrypto.getRandomValues,

	// `randomUUID` is available if Node version supports it (Node >=14.17.0 / >=15.6.0).
	randomUUID: nodeCrypto.randomUUID,

	// `randomFill` (async) and `randomFillSync` (sync)
	randomFill: nodeCrypto.randomFill,

	randomFillSync: nodeCrypto.randomFillSync,

	// `pbkdf2` (async) and `pbkdf2Sync` (sync) - common and generally CPU-bound.
	pbkdf2: nodeCrypto.pbkdf2,

	pbkdf2Sync: nodeCrypto.pbkdf2Sync,

	constants: nodeCrypto.constants,

	timingSafeEqual: nodeCrypto.timingSafeEqual,

	getHashes: nodeCrypto.getHashes,

	getCiphers: nodeCrypto.getCiphers,

	// --- Stubs for non-implemented or sensitive functions ---
	generatePrime: (...args: any[]): any => {
		const functionName = "crypto.generatePrime";

		console.warn(
			`[Cocoon Crypto Shim] STUB: ${functionName} called. This function is not implemented in Cocoon and will throw an error.`,
		);

		throw new Error(
			`${functionName} is not implemented in Cocoon. It would require proxying to Mountain or a local high-CPU implementation.`,
		);
	},

	generateKeyPair: (...args: any[]): any => {
		const functionName = "crypto.generateKeyPair";

		console.warn(
			`[Cocoon Crypto Shim] STUB: ${functionName} called. This function is not implemented in Cocoon and will throw an error.`,
		);

		throw new Error(
			`${functionName} is not implemented in Cocoon. Key pair generation typically requires proxying to Mountain for secure key management.`,
		);
	},
};

// Export the singleton instance.
export default cryptoShimInstance;

// Type assertion to ensure CocoonCryptoShim aligns with relevant parts of NodeCryptoTypes.Crypto
// This is a compile-time check. If NodeCryptoTypes.Crypto has more overloads or different
// optionality for properties than CocoonCryptoShim, this might need adjustment or explicit `Partial<>`.
// For instance, if NodeCryptoTypes.Crypto makes `randomUUID` optional due to versioning,

// but CocoonCryptoShim declares it non-optional (assuming target Node version has it),

// this assertion would guide us.
// const _typeCheck: Partial<NodeCryptoTypes.Crypto> = cryptoShimInstance;
