import { Event } from '../../../base/common/event.js';
import { IPCServer } from '../../../base/parts/ipc/common/ipc.js';
import { IProductService } from '../../product/common/productService.js';
import { IExtensionGalleryManifest, IExtensionGalleryManifestService } from './extensionGalleryManifest.js';
import { ExtensionGalleryManifestService } from './extensionGalleryManifestService.js';
export declare class ExtensionGalleryManifestIPCService extends ExtensionGalleryManifestService implements IExtensionGalleryManifestService {
    readonly _serviceBrand: undefined;
    private _onDidChangeExtensionGalleryManifest;
    readonly onDidChangeExtensionGalleryManifest: Event<IExtensionGalleryManifest | null>;
    private extensionGalleryManifest;
    private readonly barrier;
    constructor(server: IPCServer<any>, productService: IProductService);
    getExtensionGalleryManifest(): Promise<IExtensionGalleryManifest | null>;
    private setExtensionGalleryManifest;
}
