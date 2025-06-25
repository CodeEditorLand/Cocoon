import { URI } from '../../../../base/common/uri.js';
import { IRange } from '../../../common/core/range.js';
import { DiffAlgorithmName, IEditorWorkerService, IUnicodeHighlightsResult } from '../../../common/services/editorWorker.js';
import { TextEdit, IInplaceReplaceSupportResult, IColorInformation } from '../../../common/languages.js';
import { IDocumentDiff, IDocumentDiffProviderOptions } from '../../../common/diff/documentDiffProvider.js';
import { IChange } from '../../../common/diff/legacyLinesDiffComputer.js';
import { SectionHeader } from '../../../common/services/findSectionHeaders.js';
export declare class TestEditorWorkerService implements IEditorWorkerService {
    readonly _serviceBrand: undefined;
    canComputeUnicodeHighlights(uri: URI): boolean;
    computedUnicodeHighlights(uri: URI): Promise<IUnicodeHighlightsResult>;
    computeDiff(original: URI, modified: URI, options: IDocumentDiffProviderOptions, algorithm: DiffAlgorithmName): Promise<IDocumentDiff | null>;
    canComputeDirtyDiff(original: URI, modified: URI): boolean;
    computeDirtyDiff(original: URI, modified: URI, ignoreTrimWhitespace: boolean): Promise<IChange[] | null>;
    computeMoreMinimalEdits(resource: URI, edits: TextEdit[] | null | undefined): Promise<TextEdit[] | undefined>;
    computeHumanReadableDiff(resource: URI, edits: TextEdit[] | null | undefined): Promise<TextEdit[] | undefined>;
    canComputeWordRanges(resource: URI): boolean;
    computeWordRanges(resource: URI, range: IRange): Promise<{
        [word: string]: IRange[];
    } | null>;
    canNavigateValueSet(resource: URI): boolean;
    navigateValueSet(resource: URI, range: IRange, up: boolean): Promise<IInplaceReplaceSupportResult | null>;
    findSectionHeaders(uri: URI): Promise<SectionHeader[]>;
    computeDefaultDocumentColors(uri: URI): Promise<IColorInformation[] | null>;
}
