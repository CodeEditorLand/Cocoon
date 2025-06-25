import { CellKind, INotebookDiffResult } from './notebookCommon.js';
export type CellDiffInfo = {
    originalCellIndex: number;
    modifiedCellIndex: number;
    type: 'unchanged' | 'modified';
} | {
    originalCellIndex: number;
    type: 'delete';
} | {
    modifiedCellIndex: number;
    type: 'insert';
};
interface ICell {
    cellKind: CellKind;
    getHashValue(): number;
    equal(cell: ICell): boolean;
}
export declare function computeDiff(originalModel: {
    readonly cells: readonly ICell[];
}, modifiedModel: {
    readonly cells: readonly ICell[];
}, diffResult: INotebookDiffResult): {
    cellDiffInfo: CellDiffInfo[];
    firstChangeIndex: number;
};
export {};
