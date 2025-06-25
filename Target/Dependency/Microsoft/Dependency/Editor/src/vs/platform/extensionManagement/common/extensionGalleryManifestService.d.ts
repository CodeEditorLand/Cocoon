import { Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { IProductService } from '../../product/common/productService.js';
import { IExtensionGalleryManifest, IExtensionGalleryManifestService } from './extensionGalleryManifest.js';
export declare class ExtensionGalleryManifestService extends Disposable implements IExtensionGalleryManifestService {
    protected readonly productService: IProductService;
    readonly _serviceBrand: undefined;
    readonly onDidChangeExtensionGalleryManifest: Event<any>;
    constructor(productService: IProductService);
    isEnabled(): boolean;
    getExtensionGalleryManifest(): Promise<IExtensionGalleryManifest | null>;
}
