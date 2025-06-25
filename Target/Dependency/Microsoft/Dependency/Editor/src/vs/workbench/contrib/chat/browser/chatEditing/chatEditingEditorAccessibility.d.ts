import { IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IWorkbenchContribution } from '../../../../common/contributions.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IChatEditingService } from '../../common/chatEditingService.js';
export declare class ChatEditingEditorAccessibility implements IWorkbenchContribution {
    static readonly ID = "chat.edits.accessibilty";
    private readonly _store;
    constructor(chatEditingService: IChatEditingService, editorService: IEditorService, accessibilityService: IAccessibilitySignalService);
    dispose(): void;
}
