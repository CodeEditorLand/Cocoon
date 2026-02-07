/**
 * @module APIFactoryService
 * @description
 * Creates the 'vscode' API surface for extensions.
 * Wires API calls to the Universal Spine via MountainClientService.
 */

import { Effect, Layer, Context } from "effect";
import { IMountainClientService } from "../Interfaces/IMountainClientService.js";
import { IConfigurationService } from "../Interfaces/IConfigurationService.js";

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
    configService: IConfigurationService
) => {
    return {
        // --- Window Namespace ---
        window: {
            showInformationMessage: async (message: string, ...items: string[]) => {
                console.log(`[API] window.showInformationMessage: ${message}`);
                
                // Call Spine (v0.2 Windowing Batch)
                // We send a request to Mountain backend
                await mountainClient.sendRequest("window.showMessage", {
                    title: "Information",
                    message: message,
                    level: "info"
                });

                // In a real implementation, we'd wait for the user's choice from 'items'
                // For now, return undefined (dismissed) or the first item if simple
                return undefined;
            },

            showErrorMessage: async (message: string, ...items: string[]) => {
                 console.log(`[API] window.showErrorMessage: ${message}`);
                 await mountainClient.sendRequest("window.showMessage", {
                    title: "Error",
                    message: message,
                    level: "error"
                });
                return undefined;
            }
        },

        // --- Workspace Namespace ---
        workspace: {
            getConfiguration: (section?: string) => {
                // Return a configuration object that queries the ConfigService
                return {
                    get: (key: string, defaultValue?: any) => {
                        const fullKey = section ? `${section}.${key}` : key;
                        // Synchronous get from cache (v0.4 Config Batch)
                        return configService.getValue(fullKey, 0, defaultValue);
                    },
                    update: async (key: string, value: any, target: any) => {
                        const fullKey = section ? `${section}.${key}` : key;
                        // Async update to Spine
                        await configService.setValue(fullKey, value, target);
                    }
                };
            },
            
            // Stub for document handling (future v0.1.1 batch)
            openTextDocument: async (options: any) => {
                return {
                    uri: options,
                    getText: () => "",
                    lineCount: 0
                };
            }
        },

        // --- Commands Namespace ---
        commands: {
            registerCommand: (command: string, callback: (...args: any[]) => any) => {
                console.log(`[API] Registered command: ${command}`);
                // TODO: Register with Mountain for UI-driven execution
                return { dispose: () => {} };
            },
            executeCommand: async (command: string, ...args: any[]) => {
                console.log(`[API] Executing command: ${command}`);
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
        private configService: IConfigurationService
    ) {
        this.api = createVSCodeAPI(mountainClient, configService);
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
        return new APIFactoryService(mountainClient, configService);
    })
);
