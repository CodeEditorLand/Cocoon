import { NotebookTextModel } from '../../../../notebook/common/model/notebookTextModel.js';
import { ICell, ICellDto2, ICellEditOperation, NotebookCellsModelMoveEvent, NotebookCellTextModelSplice, NotebookTextModelChangedEvent } from '../../../../notebook/common/notebookCommon.js';
import { ICellDiffInfo } from './notebookCellChanges.js';
export declare function adjustCellDiffForKeepingADeletedCell(originalCellIndex: number, cellDiffInfo: ICellDiffInfo[], applyEdits: typeof NotebookTextModel.prototype.applyEdits): ICellDiffInfo[];
export declare function adjustCellDiffForRevertingADeletedCell(originalCellIndex: number, cellDiffInfo: ICellDiffInfo[], cellToInsert: ICellDto2, applyEdits: typeof NotebookTextModel.prototype.applyEdits, createModifiedCellDiffInfo: (modifiedCellIndex: number, originalCellIndex: number) => ICellDiffInfo): ICellDiffInfo[];
export declare function adjustCellDiffForRevertingAnInsertedCell(modifiedCellIndex: number, cellDiffInfo: ICellDiffInfo[], applyEdits: typeof NotebookTextModel.prototype.applyEdits): ICellDiffInfo[];
export declare function adjustCellDiffForKeepingAnInsertedCell(modifiedCellIndex: number, cellDiffInfo: ICellDiffInfo[], cellToInsert: ICellDto2, applyEdits: typeof NotebookTextModel.prototype.applyEdits, createModifiedCellDiffInfo: (modifiedCellIndex: number, originalCellIndex: number) => ICellDiffInfo): ICellDiffInfo[];
export declare function adjustCellDiffAndOriginalModelBasedOnCellAddDelete(change: NotebookCellTextModelSplice<ICell>, cellDiffInfo: ICellDiffInfo[], modifiedModelCellCount: number, originalModelCellCount: number, applyEdits: typeof NotebookTextModel.prototype.applyEdits, createModifiedCellDiffInfo: (modifiedCellIndex: number, originalCellIndex: number) => ICellDiffInfo): ICellDiffInfo[];
/**
 * Given the movements of cells in modified notebook, adjust the ICellDiffInfo[] array
 * and generate edits for the old notebook (if required).
 * TODO@DonJayamanne Handle bulk moves (movements of more than 1 cell).
 */
export declare function adjustCellDiffAndOriginalModelBasedOnCellMovements(event: NotebookCellsModelMoveEvent<ICell>, cellDiffInfo: ICellDiffInfo[]): [ICellDiffInfo[], ICellEditOperation[]] | undefined;
export declare function getCorrespondingOriginalCellIndex(modifiedCellIndex: number, cellDiffInfo: ICellDiffInfo[]): number | undefined;
/**
 *
 * This isn't great, but necessary.
 * ipynb extension updates metadata when new cells are inserted (to ensure the metadata is correct)
 * Details of why thats required is in ipynb extension, but its necessary.
 * However as a result of this, those edits appear here and are assumed to be user edits.
 * As a result `_allEditsAreFromUs` is set to false.
 */
export declare function isTransientIPyNbExtensionEvent(notebookKind: string, e: NotebookTextModelChangedEvent): boolean;
export declare function calculateNotebookRewriteRatio(cellsDiff: ICellDiffInfo[], originalModel: NotebookTextModel, modifiedModel: NotebookTextModel): number;
