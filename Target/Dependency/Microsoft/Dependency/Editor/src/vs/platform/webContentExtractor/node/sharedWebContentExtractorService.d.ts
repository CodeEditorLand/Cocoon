import { VSBuffer } from '../../../base/common/buffer.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { URI } from '../../../base/common/uri.js';
import { ISharedWebContentExtractorService } from '../common/webContentExtractor.js';
export declare class SharedWebContentExtractorService implements ISharedWebContentExtractorService {
    _serviceBrand: undefined;
    readImage(uri: URI, token: CancellationToken): Promise<VSBuffer | undefined>;
}
