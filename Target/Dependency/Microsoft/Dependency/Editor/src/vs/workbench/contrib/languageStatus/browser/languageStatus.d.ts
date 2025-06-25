import './media/languageStatus.css';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';
import { Action2 } from '../../../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
export declare class LanguageStatusContribution extends Disposable implements IWorkbenchContribution {
    private readonly editorGroupService;
    static readonly Id = "status.languageStatus";
    constructor(editorGroupService: IEditorGroupsService);
    private createLanguageStatus;
}
export declare class ResetAction extends Action2 {
    constructor();
    run(accessor: ServicesAccessor): void;
}
