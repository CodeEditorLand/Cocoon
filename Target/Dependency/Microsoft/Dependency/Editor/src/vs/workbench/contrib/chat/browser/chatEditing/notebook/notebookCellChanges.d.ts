import { ISettableObservable, ObservablePromise } from '../../../../../../base/common/observable.js';
import { IDocumentDiff } from '../../../../../../editor/common/diff/documentDiffProvider.js';
import { DetailedLineRangeMapping } from '../../../../../../editor/common/diff/rangeMapping.js';
import { ITextModel } from '../../../../../../editor/common/model.js';
/**
 * This structure is used to represent the state of a Notebook document compared to the original.
 * Its similar to the IDocumentDiff object, that tells us what cells are unmodified, modified, inserted or deleted.
 *
 * All entries will contain a IDocumentDiff
 * Even when there are no changes, diff will contain the number of lines in the document.
 * This way we can always calculate the total number of lines in the document.
 */
export type ICellDiffInfo = {
    originalCellIndex: number;
    modifiedCellIndex: number;
    type: 'unchanged';
} & IDocumentDiffWithModelsAndActions | {
    originalCellIndex: number;
    modifiedCellIndex: number;
    type: 'modified';
} & IDocumentDiffWithModelsAndActions | {
    modifiedCellIndex: undefined;
    originalCellIndex: number;
    type: 'delete';
} & IDocumentDiffWithModelsAndActions | {
    modifiedCellIndex: number;
    originalCellIndex: undefined;
    type: 'insert';
} & IDocumentDiffWithModelsAndActions;
interface IDocumentDiffWithModelsAndActions {
    /**
     * The changes between the original and modified document.
     */
    diff: ISettableObservable<IDocumentDiff>;
    /**
     * The original model.
     * Cell text models load asynchronously, so this is an observable promise.
     */
    originalModel: ObservablePromise<ITextModel>;
    /**
     * The modified model.
     * Cell text models load asynchronously, so this is an observable promise.
     */
    modifiedModel: ObservablePromise<ITextModel>;
    keep(changes: DetailedLineRangeMapping): Promise<boolean>;
    undo(changes: DetailedLineRangeMapping): Promise<boolean>;
}
export declare function countChanges(changes: ICellDiffInfo[]): number;
export declare function sortCellChanges(changes: ICellDiffInfo[]): ICellDiffInfo[];
export {};
