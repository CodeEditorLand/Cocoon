// Basic crypto shim - relies on Node's built-in crypto where possible, proxies if needed
import * as nodeCrypto from "node:crypto";

// Only needed if proxying
// import { sendToMountainAndWait } from "../cocoon-ipc";

// Define the shape of the exported module if it were to be more complex
// For now, it directly mirrors parts of nodeCrypto
export interface CocoonCrypto {
	createHash: typeof nodeCrypto.createHash;

	createHmac: typeof nodeCrypto.createHmac;

	randomBytes: typeof nodeCrypto.randomBytes;

	randomUUID: typeof nodeCrypto.randomUUID;

	// generateKeyPair?: (
	// 	type: 'rsa' | 'dsa' | 'ec' | 'ed25519' | 'ed448' | 'x25519' | 'x448' | 'dh',
	// 	options: nodeCrypto.GenerateKeyPairKeyObjectOptions | nodeCrypto.GenerateKeyPairStringOptions,
	// 	callback: (err: Error | null, publicKey: string | Buffer | nodeCrypto.KeyObject, privateKey: string | Buffer | nodeCrypto.KeyObject) => void
	// ) => void;

	// generateKeyPair?: (
	// More generic for potential proxying
	// 	type: string,
	// 	options: any
	// If async version
	// ) => Promise<{ publicKey: string | Buffer | nodeCrypto.KeyObject, privateKey: string | Buffer | nodeCrypto.KeyObject }>;
}

const cryptoShim: CocoonCrypto = {
	// Functions likely safe to run directly in Cocoon's Node env
	createHash: nodeCrypto.createHash,
	createHmac: nodeCrypto.createHmac,

	// Usually available
	randomBytes: nodeCrypto.randomBytes,
	

	// Modern Node only (check Node version compatibility if necessary)
	randomUUID: nodeCrypto.randomUUID,

	// Example of a function that *might* need proxying if it involved system specifics
	// generateKeyPair: async (type: string, options: any) => {

	//    console.warn("[Cocoon Crypto Shim] generateKeyPair - proxying to Mountain (example)");

	// Assuming sendToMountainAndWait is properly typed and imported
	//
	//    return sendToMountainAndWait('crypto_generateKeyPair', { type, options }, 5000);

	// }
	// Add other functions as needed, deciding whether to use nodeCrypto or proxy
};

export default cryptoShim;

// Or, if you prefer direct exports matching the original module.exports structure:
// export const createHash = nodeCrypto.createHash;

// export const createHmac = nodeCrypto.createHmac;

// export const randomBytes = nodeCrypto.randomBytes;

// export const randomUUID = nodeCrypto.randomUUID;
