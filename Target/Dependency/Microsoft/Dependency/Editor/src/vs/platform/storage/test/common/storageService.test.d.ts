import { IStorageService } from '../../common/storage.js';
export declare function createSuite<T extends IStorageService>(params: {
    setup: () => Promise<T>;
    teardown: (service: T) => Promise<void>;
}): void;
