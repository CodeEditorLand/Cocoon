import * as pfs from '../../../../base/node/pfs.js';
import { ITextQuery, ITextSearchStats } from '../common/search.js';
import { TextSearchProvider2 } from '../common/searchExtTypes.js';
import { TextSearchManager } from '../common/textSearchManager.js';
export declare class NativeTextSearchManager extends TextSearchManager {
    constructor(query: ITextQuery, provider: TextSearchProvider2, _pfs?: typeof pfs, processType?: ITextSearchStats['type']);
}
