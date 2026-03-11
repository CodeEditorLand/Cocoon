/**
 * @module FileSystemService
 * @description
 * Implements the VS Code FileSystem API over the Universal Spine.
 * Handles URI schemes and maps 'file://' requests to Mountain's FS Spine.
 */

import { Context, Effect, Layer } from "effect";

import { IMountainClientService } from "../Interfaces/IMountainClientService.js";

// --- Interfaces ---

export interface IFileSystemService {
	stat(uri: any): Promise<any>;
	readFile(uri: any): Promise<Uint8Array>;
	writeFile(uri: any, content: Uint8Array): Promise<void>;
	readDirectory(uri: any): Promise<[string, any][]>;
	createDirectory(uri: any): Promise<void>;
	delete(uri: any, options: { recursive: boolean }): Promise<void>;
	rename(
		source: any,
		target: any,
		options: { overwrite: boolean },
	): Promise<void>;
}

export const IFileSystemService = Context.Tag<IFileSystemService>();

// --- Implementation ---

export class FileSystemService implements IFileSystemService {
	constructor(private mountainClient: IMountainClientService) {}

	async stat(uri: any): Promise<any> {
		// Maps to 'fs.stat' in Spine (Future Batch)
		// For now, we simulate a file stat if we can read it
		try {
			await this.readFile(uri);
			return { type: 1, ctime: 0, mtime: 0, size: 0 }; // File
		} catch {
			throw new Error("File not found");
		}
	}

	async readFile(uri: any): Promise<Uint8Array> {
		if (uri.scheme !== "file") {
			throw new Error(`Unsupported scheme: ${uri.scheme}`);
		}

		// Call Spine (v0.1 Filesystem Batch)
		const response = await this.mountainClient.sendRequest(
			"fs.readFile",
			uri.fsPath,
		);

		// Response payload is already a buffer/array from gRPC
		return response;
	}

	async writeFile(uri: any, content: Uint8Array): Promise<void> {
		if (uri.scheme !== "file") {
			throw new Error(`Unsupported scheme: ${uri.scheme}`);
		}

		// Call Spine (v0.1 Filesystem Batch)
		await this.mountainClient.sendRequest("fs.writeFile", {
			path: uri.fsPath,
			content: Array.from(content), // Serialize buffer to array
		});
	}

	async readDirectory(uri: any): Promise<[string, any][]> {
		if (uri.scheme !== "file") {
			throw new Error(`Unsupported scheme: ${uri.scheme}`);
		}

		// Call Spine (v0.1 Filesystem Batch)
		// Maps to 'fs.listDir'
		const entries: string[] = await this.mountainClient.sendRequest(
			"fs.listDir",
			uri.fsPath,
		);

		// Map to [name, type] tuple
		return entries.map((name) => [name, 1]); // 1=File (Simplification)
	}

	async createDirectory(uri: any): Promise<void> {
		await this.mountainClient.sendRequest("fs.createDir", uri.fsPath);
	}

	async delete(uri: any, options: { recursive: boolean }): Promise<void> {
		await this.mountainClient.sendRequest("fs.delete", uri.fsPath);
	}

	async rename(
		source: any,
		target: any,
		options: { overwrite: boolean },
	): Promise<void> {
		// Note: 'overwrite' flag support depends on backend logic, ignoring for now
		await this.mountainClient.sendRequest("fs.rename", {
			from: source.fsPath,
			to: target.fsPath,
		});
	}
}

/**
 * Service Layer
 */
export const FileSystemServiceLayer = Layer.effect(
	IFileSystemService,
	Effect.gen(function* () {
		const mountainClient = yield* IMountainClientService;
		return new FileSystemService(mountainClient);
	}),
);
