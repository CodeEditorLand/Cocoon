/**
 * @module CryptoShim (NodeModuleShim/Shim)
 * @description A controlled shim for the Node.js `crypto` module.
 *
 * This shim provides a safe subset of the `crypto` module's functionality to extensions.
 * It directly delegates common, safe operations (like hashing and random data generation)
 * to the native Node.js implementation, while explicitly stubbing out and blocking
 * more sensitive or computationally expensive operations to maintain host stability
 * and security.
 */

import * as NodeCrypto from "node:crypto";

/**
 * Creates a function that, when called, throws an error indicating that a
 * specific crypto feature is not implemented or is disallowed.
 * @param Name - The name of the stubbed function.
 */
const CreateStub = (Name: string) => {
	return () => {
		throw new Error(
			`[Cocoon Crypto Shim] STUB: 'crypto.${Name}' is not implemented or is disallowed in the Cocoon runtime.`,
		);
	};
};

/**
 * The shim object for the `crypto` module.
 */
export const CryptoShim = {
	// --- Direct Delegations (Safe Functions) ---
	createHash: NodeCrypto.createHash,
	createHmac: NodeCrypto.createHmac,
	randomBytes: NodeCrypto.randomBytes,
	getRandomValues: NodeCrypto.getRandomValues,
	randomUUID: NodeCrypto.randomUUID,
	randomFill: NodeCrypto.randomFill,
	randomFillSync: NodeCrypto.randomFillSync,
	pbkdf2: NodeCrypto.pbkdf2,
	pbkdf2Sync: NodeCrypto.pbkdf2Sync,
	timingSafeEqual: NodeCrypto.timingSafeEqual,
	getHashes: NodeCrypto.getHashes,
	getCiphers: NodeCrypto.getCiphers,
	constants: NodeCrypto.constants,

	// --- Blocked / Stubbed Functions (Sensitive or Complex) ---
	generatePrime: NodeCrypto.generatePrime
		? CreateStub("generatePrime")
		: undefined,
	generateKeyPair: CreateStub("generateKeyPair"),
	generateKeyPairSync: CreateStub("generateKeyPairSync"),
	createCipheriv: CreateStub("createCipheriv"),
	createDecipheriv: CreateStub("createDecipheriv"),
	// Add other sensitive functions to the blocklist as needed.
};
