import './media/gettingStarted.css';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { URI } from '../../../../base/common/uri.js';
import { IUntypedEditorInput } from '../../../common/editor.js';
import { IEditorOptions } from '../../../../platform/editor/common/editor.js';
export declare const gettingStartedInputTypeId = "workbench.editors.gettingStartedInput";
export interface GettingStartedEditorOptions extends IEditorOptions {
    selectedCategory?: string;
    selectedStep?: string;
    showTelemetryNotice?: boolean;
    showWelcome?: boolean;
    walkthroughPageTitle?: string;
    showNewExperience?: boolean;
}
export declare class GettingStartedInput extends EditorInput {
    static readonly ID = "workbench.editors.gettingStartedInput";
    static readonly RESOURCE: URI;
    private _selectedCategory;
    private _selectedStep;
    private _showTelemetryNotice;
    private _showWelcome;
    private _walkthroughPageTitle;
    get typeId(): string;
    get editorId(): string | undefined;
    toUntyped(): IUntypedEditorInput;
    get resource(): URI | undefined;
    matches(other: EditorInput | IUntypedEditorInput): boolean;
    constructor(options: GettingStartedEditorOptions);
    getName(): string;
    get selectedCategory(): string | undefined;
    set selectedCategory(selectedCategory: string | undefined);
    get selectedStep(): string | undefined;
    set selectedStep(selectedStep: string | undefined);
    get showTelemetryNotice(): boolean;
    set showTelemetryNotice(value: boolean);
    get showWelcome(): boolean;
    set showWelcome(value: boolean);
    get walkthroughPageTitle(): string | undefined;
    set walkthroughPageTitle(value: string | undefined);
}
