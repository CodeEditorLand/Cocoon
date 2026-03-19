/**
 * @module APIFactoryService
 * @description
 * Creates the 'vscode' API surface for extensions.
 * Wires API calls to the Universal Spine via MountainClientService.
 */

import { Context, Effect, Layer } from "effect";

import { IConfigurationService } from "../Interfaces/IConfigurationService.js";
import { IFileSystemService } from "../Interfaces/IFileSystemService.js";
import { IModuleInterceptorService } from "../Interfaces/IModuleInterceptorService.js";
import { IMountainClientService } from "../Interfaces/IMountainClientService.js";
import { ITerminalService } from "../Interfaces/ITerminalService.js";

// --- API Service Interface ---

export interface IAPIFactoryService {
	createAPI(): any;
}
export const IAPIFactoryService = Context.Tag<IAPIFactoryService>();

// --- API Implementation ---

interface VSCodeAPI {
	version: string;
	env: any;
	commands: any;
	window: any;
	workspace: any;
	extensions: any;
	languages: any;
	debug: any;
	scm: any;
	authentication: any;
	[key: string]: any;
}

/**
 * Creates the 'vscode' namespace
 */
const createVSCodeAPI = (
	mountainClient: IMountainClientService,
	configService: IConfigurationService,
	fsService: IFileSystemService,
	terminalService: ITerminalService,
): VSCodeAPI => {
	return {
		version: "1.88.0",

		// --- Window Namespace ---
		window: {
			showInformationMessage: async (
				message: string,
				...items: string[]
			) => {
				await mountainClient.sendRequest("window.showMessage", {
					title: "Information",
					message: message,
					level: "info",
				});
				return undefined;
			},
			showErrorMessage: async (message: string, ...items: string[]) => {
				await mountainClient.sendRequest("window.showMessage", {
					title: "Error",
					message: message,
					level: "error",
				});
				return undefined;
			},
			showWarningMessage: async (message: string, ...items: string[]) => {
				await mountainClient.sendRequest("window.showMessage", {
					title: "Warning",
					message: message,
					level: "warn",
				});
				return undefined;
			},
			createTerminal: (options: any) => {
				const name =
					typeof options === "string" ? options : options.name;
				const shellPath =
					typeof options === "object" ? options.shellPath : undefined;
				const cwd =
					typeof options === "object" ? options.cwd : undefined;

				const terminalIdPromise = terminalService.createTerminal(
					name,
					shellPath,
					cwd,
				);

				return {
					name,
					sendText: async (text: string) => {
						const id = await terminalIdPromise;
						await terminalService.sendText(id, text);
					},
					show: () => {},
					hide: () => {},
					dispose: async () => {
						const id = await terminalIdPromise;
						await terminalService.kill(id);
					},
				};
			},
			createStatusBarItem: (alignment?: any, priority?: number) => ({
				show: () => {},
				hide: () => {},
				dispose: () => {},
				text: "",
				tooltip: "",
				command: undefined,
			}),
			createOutputChannel: (name: string) => ({
				append: (value: string) => {},
				appendLine: (value: string) => {},
				clear: () => {},
				show: () => {},
				hide: () => {},
				dispose: () => {},
			}),
			withProgress: async (options: any, task: any) => {
				return task({ report: (value: any) => {} });
			},
		},

		// --- Workspace Namespace ---
		workspace: {
			workspaceFolders: [],
			getConfiguration: (section?: string) => {
				return {
					get: (key: string, defaultValue?: any) => {
						const fullKey = section ? `${section}.${key}` : key;
						return configService.getValue(fullKey, 0, defaultValue);
					},
					update: async (key: string, value: any, target: any) => {
						const fullKey = section ? `${section}.${key}` : key;
						await configService.setValue(fullKey, value, target);
					},
					has: (key: string) =>
						configService.hasKey(
							section ? `${section}.${key}` : key,
							0,
						),
					inspect: (key: string) =>
						configService.inspect(
							section ? `${section}.${key}` : key,
							0,
						),
				};
			},
			// Filesystem API (Real Implementation)
			fs: {
				stat: (uri: any) => fsService.stat(uri),
				readFile: (uri: any) => fsService.readFile(uri),
				writeFile: (uri: any, content: Uint8Array) =>
					fsService.writeFile(uri, content),
				readDirectory: (uri: any) => fsService.readDirectory(uri),
				createDirectory: (uri: any) => fsService.createDirectory(uri),
				delete: (uri: any, options: { recursive: boolean }) =>
					fsService.delete(uri, options),
				rename: (
					source: any,
					target: any,
					options: { overwrite: boolean },
				) => fsService.rename(source, target, options),
			},
			findFiles: async (include: string) => [],
			openTextDocument: async (uri: any) => ({
				getText: () => "",
				uri,
				languageId: "plaintext",
				lineCount: 0,
				fileName: uri.fsPath || "",
			}),
		},

		// --- Commands Namespace ---
		commands: {
			registerCommand: (
				command: string,
				callback: (...args: any[]) => any,
			) => {
				console.log(`[APIFactory] Registered command: ${command}`);
				return { dispose: () => {} };
			},
			executeCommand: async (command: string, ...args: any[]) => {
				return undefined;
			},
			getCommands: async () => [],
		},

		// --- Env Namespace ---
		env: {
			appName: "Cocoon",
			appRoot: "/app",
			language: "en-US",
			clipboard: {
				readText: async () => "",
				writeText: async (value: string) => {},
			},
			openExternal: async (target: any) => true,
		},

		// --- Stubs for Compatibility ---
		extensions: {
			getExtension: (id: string) => undefined,
			all: [],
		},
		languages: {
			getLanguages: () => [],
			createDiagnosticCollection: () => ({
				set: () => {},
				clear: () => {},
				dispose: () => {},
			}),
		},
		debug: {
			startDebugging: async () => false,
			activeDebugSession: undefined,
		},
		scm: {
			createSourceControl: (id: string, label: string) => ({
				createResourceGroup: (id: string, label: string) => ({
					resourceStates: [],
				}),
				dispose: () => {},
			}),
		},
		authentication: {
			getSession: async () => undefined,
		},
	};
};

/**
 * APIFactoryService implementation
 */
export class APIFactoryService implements IAPIFactoryService {
	readonly _serviceBrand: undefined;
	private api: any;

	constructor(
		private mountainClient: IMountainClientService,
		private configService: IConfigurationService,
		private fsService: IFileSystemService,
		private terminalService: ITerminalService,
		private moduleInterceptor: IModuleInterceptorService,
	) {
		this.api = createVSCodeAPI(
			mountainClient,
			configService,
			fsService,
			terminalService,
		);
	}

	/**
	 * Create/Get the API instance
	 */
	createAPI(): any {
		return this.api;
	}
}

/**
 * Service Layer
 */
export const APIFactoryLayer = Layer.effect(
	IAPIFactoryService,
	Effect.gen(function* () {
		const mountainClient = yield* IMountainClientService;
		const configService = yield* IConfigurationService;
		const fsService = yield* IFileSystemService;
		const terminalService = yield* ITerminalService;
		const moduleInterceptor = yield* IModuleInterceptorService;

		return new APIFactoryService(
			mountainClient,
			configService,
			fsService,
			terminalService,
			moduleInterceptor,
		);
	}),
);
