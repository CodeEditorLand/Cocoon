import '../media/chatEditingEditorOverlay.css';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchContribution } from '../../../../common/contributions.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
export declare class ChatEditingEditorOverlay implements IWorkbenchContribution {
    static readonly ID = "chat.edits.editorOverlay";
    private readonly _store;
    constructor(editorGroupsService: IEditorGroupsService, instantiationService: IInstantiationService);
    dispose(): void;
}
