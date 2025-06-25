import '../media/simpleBrowserOverlay.css';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchContribution } from '../../../../common/contributions.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
export declare class SimpleBrowserOverlay implements IWorkbenchContribution {
    static readonly ID = "chat.simpleBrowser.overlay";
    private readonly _store;
    constructor(editorGroupsService: IEditorGroupsService, instantiationService: IInstantiationService);
    dispose(): void;
}
