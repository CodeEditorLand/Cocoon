import { IWebContentExtractorService } from '../common/webContentExtractor.js';
import { URI } from '../../../base/common/uri.js';
export declare class NativeWebContentExtractorService implements IWebContentExtractorService {
    _serviceBrand: undefined;
    private _limiter;
    private _webContentsCache;
    private readonly _cacheDuration;
    private isExpired;
    extract(uris: URI[]): Promise<string[]>;
    doExtract(uri: URI): Promise<string>;
}
