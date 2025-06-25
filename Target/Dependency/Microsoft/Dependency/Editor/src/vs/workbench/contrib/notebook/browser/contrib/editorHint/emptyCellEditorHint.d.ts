import { ICodeEditor } from '../../../../../../editor/browser/editorBrowser.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IChatAgentService } from '../../../../chat/common/chatAgents.js';
import { EmptyTextEditorHintContribution } from '../../../../codeEditor/browser/emptyTextEditorHint/emptyTextEditorHint.js';
import { IInlineChatSessionService } from '../../../../inlineChat/browser/inlineChatSessionService.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
export declare class EmptyCellEditorHintContribution extends EmptyTextEditorHintContribution {
    private readonly _editorService;
    static readonly CONTRIB_ID = "notebook.editor.contrib.emptyCellEditorHint";
    constructor(editor: ICodeEditor, _editorService: IEditorService, configurationService: IConfigurationService, inlineChatSessionService: IInlineChatSessionService, chatAgentService: IChatAgentService, instantiationService: IInstantiationService);
    protected shouldRenderHint(): boolean;
}
