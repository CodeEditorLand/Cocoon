import { ISecretStorageService } from '../../common/secrets.js';
export declare class TestSecretStorageService implements ISecretStorageService {
    readonly _serviceBrand: undefined;
    private readonly _storage;
    private readonly _onDidChangeSecretEmitter;
    readonly onDidChangeSecret: import("../../../../workbench/workbench.web.main.internal.js").Event<string>;
    type: "in-memory";
    get(key: string): Promise<string | undefined>;
    set(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): void;
    dispose(): void;
}
