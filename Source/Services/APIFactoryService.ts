/**
 * @module APIFactoryService
 * @description
 * Creates the 'vscode' API surface for extensions.
 * Wires API calls to the Universal Spine via MountainClientService.
 */

import { Effect, Layer, Context } from "effect";
import { IMountainClientService } from "../Interfaces/IMountainClientService.js";
import { IConfigurationService } from "../Interfaces/IConfigurationService.js";
import { IFileSystemService } from "../Interfaces/IFileSystemService.js";
import { ITerminalService } from "../Interfaces/ITerminalService.js";

// --- API Service Interface ---

export interface IAPIFactoryService {
    createAPI(): any;
}
export const IAPIFactoryService = Context.Tag<IAPIFactoryService>();

// --- API Implementation ---

/**
 * Creates the 'vscode' namespace
 */
const createVSCodeAPI = (
    mountainClient: IMountainClientService,
    configService: IConfigurationService,
    fsService: IFileSystemService,
    terminalService: ITerminalService
) => {
    return {
        // --- Window Namespace ---
        window: {
            showInformationMessage: async (message: string, ...items: string[]) => {
                await mountainClient.sendRequest("window.showMessage", {
                    title: "Information",
                    message: message,
                    level: "info"
                });
                return undefined;
            },
            showErrorMessage: async (message: string, ...items: string[]) => {
                 await mountainClient.sendRequest("window.showMessage", {
                    title: "Error",
                    message: message,
                    level: "error"
                });
                return undefined;
            },
            createTerminal: (options: any) => {
                const name = typeof options === 'string' ? options : options.name;
                const shellPath = typeof options === 'object' ? options.shellPath : undefined;
                const cwd = typeof options === 'object' ? options.cwd : undefined;

                // Create terminal asynchronously in background, return sync proxy
                const terminalIdPromise = terminalService.createTerminal(name, shellPath, cwd);
                
                return {
                    name,
                    sendText: async (text: string) => {
                        const id = await terminalIdPromise;
                        await terminalService.sendText(id, text);
                    },
                    show: () => {}, // TODO: Implement UI focus
                    hide: () => {},
                    dispose: async () => {
                         const id = await terminalIdPromise;
                         await terminalService.kill(id);
                    }
                };
            }
        },

        // --- Workspace Namespace ---
        workspace: {
            getConfiguration: (section?: string) => {
                return {
                    get: (key: string, defaultValue?: any) => {
                        const fullKey = section ? `${section}.${key}` : key;
                        return configService.getValue(fullKey, 0, defaultValue);
                    },
                    update: async (key: string, value: any, target: any) => {
                        const fullKey = section ? `${section}.${key}` : key;
                        await configService.setValue(fullKey, value, target);
                    }
                };
            },
            // Filesystem API
            fs: {
                stat: (uri: any) => fsService.stat(uri),
                readFile: (uri: any) => fsService.readFile(uri),
                writeFile: (uri: any, content: Uint8Array) => fsService.writeFile(uri, content),
                readDirectory: (uri: any) => fsService.readDirectory(uri),
                createDirectory: (uri: any) => fsService.createDirectory(uri),
                delete: (uri: any, options: { recursive: boolean }) => fsService.delete(uri, options),
                rename: (source: any, target: any, options: { overwrite: boolean }) => fsService.rename(source, target, options)
            }
        },

        // --- Commands Namespace ---
        commands: {
            registerCommand: (command: string, callback: (...args: any[]) => any) => {
                return { dispose: () => {} };
            },
            executeCommand: async (command: string, ...args: any[]) => {
                return undefined;
            }
        },
        
        // --- Env Namespace ---
        env: {
            appName: "CodeEditorLand",
            appRoot: "/app",
            language: "en"
        }
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
        private terminalService: ITerminalService
    ) {
        this.api = createVSCodeAPI(mountainClient, configService, fsService, terminalService);
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
        return new APIFactoryService(mountainClient, configService, fsService, terminalService);
    })
);
