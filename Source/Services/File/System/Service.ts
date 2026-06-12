/**
 * @module FileSystemService
 * @description
 * Implements the VS Code FileSystem API over the Universal Spine.
 * Handles URI schemes and maps 'file://' requests to Mountain's FS Spine.
 */

import { IMountainClientService } from "../../../Interfaces/I/Mountain/Client/Service.js";

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

export const IFileSystemService: unique symbol = Symbol.for("IFileSystemService";

// --- Implementation ---

export class FileSystemService implements IFileSystemService {
	constructor(private mountainClient: IMountainClientService) {}

	async stat(uri: any): Promise<any> {
		const Path =
			uri.fsPath ?? uri.path ?? uri.toString().replace("file://", "";

		const Response = await this.mountainClient.sendRequest(
			"FileSystem.Stat",

			Path,
		;

		if (!Response) throw new Error(`File not found: ${Path}`;

		// Mountain returns: { type, is_file, is_directory, size, mtime }
		// VS Code FileType: 0=Unknown, 1=File, 2=Directory, 64=SymbolicLink
		return {
			type: Response.type ?? 1,

			ctime: 0,

			mtime: Response.mtime ?? 0,

			size: Response.size ?? 0,
		};
	}

	async readFile(uri: any): Promise<Uint8Array> {
		if (uri.scheme !== "file") {
			throw new Error(`Unsupported scheme: ${uri.scheme}`;
		}

		// Call Spine (v0.1 Filesystem Batch)
		const response = await this.mountainClient.sendRequest(
			"FileSystem.ReadFile",

			uri.fsPath,
		;

		// Response payload is already a buffer/array from gRPC
		return response;
	}

	async writeFile(uri: any, content: Uint8Array): Promise<void> {
		if (uri.scheme !== "file") {
			throw new Error(`Unsupported scheme: ${uri.scheme}`;
		}

		// Call Spine (v0.1 Filesystem Batch)
		await this.mountainClient.sendRequest("FileSystem.WriteFile", {
			path: uri.fsPath,
			content: Array.from(content), // Serialize buffer to array
		};
	}

	async readDirectory(uri: any): Promise<[string, any][]> {
		if (uri.scheme !== "file") {
			throw new Error(`Unsupported scheme: ${uri.scheme}`;
		}

		const Path =
			uri.fsPath ?? uri.path ?? uri.toString().replace("file://", "";

		// Mountain now returns [{name, type}] where type 1=File 2=Directory
		const Entries: Array<{ name: string; type: number }> =
			await this.mountainClient.sendRequest(
				"FileSystem.ReadDirectory",

				Path,
			;

		return (Entries ?? []).map((E) =>
			typeof E === "string" ? [E, 1] : [E.name, E.type],
		;
	}

	async createDirectory(uri: any): Promise<void> {
		await this.mountainClient.sendRequest(
			"FileSystem.CreateDirectory",

			uri.fsPath,
		;
	}

	async delete(uri: any, _options: { recursive: boolean }): Promise<void> {
		await this.mountainClient.sendRequest("FileSystem.Delete", uri.fsPath;
	}

	async rename(
		source: any,

		target: any,

		_options: { overwrite: boolean },
	): Promise<void> {
		// Note: 'overwrite' flag support depends on backend logic, ignoring for now
		await this.mountainClient.sendRequest("FileSystem.Rename", {
			from: source.fsPath,
			to: target.fsPath,
		};
	}
}

/**
 * Service Layer
 */
export const FileSystemServiceLayer = Layer.effect(
	IFileSystemService,

	async function() {
		const mountainClient = yield* IMountainClientService;

		return new FileSystemService(mountainClient;
	}),
;
