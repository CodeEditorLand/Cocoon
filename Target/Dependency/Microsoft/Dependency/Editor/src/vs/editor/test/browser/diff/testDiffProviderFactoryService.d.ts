import { IDocumentDiffProvider } from '../../../common/diff/documentDiffProvider.js';
import { IDiffProviderFactoryService } from '../../../browser/widget/diffEditor/diffProviderFactoryService.js';
export declare class TestDiffProviderFactoryService implements IDiffProviderFactoryService {
    readonly _serviceBrand: undefined;
    createDiffProvider(): IDocumentDiffProvider;
}
