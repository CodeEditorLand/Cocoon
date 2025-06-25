import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { INotebookEditor, INotebookEditorContribution } from '../../notebookBrowser.js';
export declare class TroubleshootController extends Disposable implements INotebookEditorContribution {
    private readonly _notebookEditor;
    static id: string;
    private readonly _localStore;
    private _cellStateListeners;
    private _enabled;
    private _cellStatusItems;
    private _cellOverlayIds;
    private _notebookOverlayDomNode;
    constructor(_notebookEditor: INotebookEditor);
    toggle(): void;
    private _update;
    private _log;
    private _createCellOverlays;
    private _createNotebookOverlay;
    private _createCellOverlay;
    private _removeCellOverlays;
    private _removeNotebookOverlay;
    private _updateListener;
    private _getItemsForCells;
    dispose(): void;
}
