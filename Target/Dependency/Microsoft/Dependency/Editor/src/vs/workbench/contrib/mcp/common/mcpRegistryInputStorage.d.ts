import { Disposable } from '../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ISecretStorageService } from '../../../../platform/secrets/common/secrets.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { IResolvedValue } from '../../../services/configurationResolver/common/configurationResolverExpression.js';
export declare class McpRegistryInputStorage extends Disposable {
    private readonly _scope;
    private readonly _storageService;
    private readonly _secretStorageService;
    private readonly _logService;
    private static secretSequencer;
    private readonly _secretsSealerSequencer;
    private readonly _getEncryptionKey;
    private _didChange;
    private _record;
    constructor(_scope: StorageScope, _target: StorageTarget, _storageService: IStorageService, _secretStorageService: ISecretStorageService, _logService: ILogService);
    /** Deletes all collection data from storage. */
    clearAll(): void;
    /** Delete a single collection data from the storage. */
    clear(inputKey: string): Promise<void>;
    /** Gets a mapping of saved input data. */
    getMap(): Promise<{
        [x: string]: IResolvedValue;
    }>;
    /** Updates the input data mapping. */
    setPlainText(values: Record<string, IResolvedValue>): Promise<void>;
    /** Updates the input secrets mapping. */
    setSecrets(values: Record<string, IResolvedValue>): Promise<void>;
    private _sealSecrets;
    private _unsealSecrets;
}
