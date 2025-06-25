import { CellKind } from '../notebookCommon.js';
type ICell = {
    internalMetadata?: {
        internalId?: string;
    };
    getValue(): string;
    getLinesContent(): string[];
    cellKind: CellKind;
};
/**
 * Given a set of modified cells and original cells, this function will attempt to match the modified cells with the original cells.
 * E.g. Assume you have (original on left and modified on right):
 * =================
 * Cell A  | Cell a
 * Cell B  | Cell b
 * Cell C  | Cell d
 * Cell D  | Cell e
 * =================
 * Here we know that `Cell C` has been removed and `Cell e` has been added.
 * The mapping from modified to original will be as follows:
 * Cell a => Cell A
 * Cell b => Cell B
 * Cell d => Cell D
 * Cell e => <Does not match anything in original, hence a new Cell>
 * Cell C in original was not matched, hence it was deleted.
 *
 * Thus the return value is as follows:
 * [
 * { modified: 0, original: 0 },
 * { modified: 1, original: 1 },
 * { modified: 2, original: 3 },
 * { modified: 3, original: -1 },
 * ]
 * @returns
 */
export declare function matchCellBasedOnSimilarties(modifiedCells: ICell[], originalCells: ICell[]): {
    modified: number;
    original: number;
    percentage: number;
}[];
export {};
