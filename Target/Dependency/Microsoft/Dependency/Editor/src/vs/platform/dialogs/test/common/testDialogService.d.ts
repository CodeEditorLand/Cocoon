import { Event } from '../../../../base/common/event.js';
import { IConfirmation, IConfirmationResult, IDialogService, IInputResult, IPrompt, IPromptResult, IPromptResultWithCancel, IPromptWithCustomCancel, IPromptWithDefaultCancel } from '../../common/dialogs.js';
export declare class TestDialogService implements IDialogService {
    private defaultConfirmResult;
    private defaultPromptResult;
    readonly _serviceBrand: undefined;
    readonly onWillShowDialog: Event<any>;
    readonly onDidShowDialog: Event<any>;
    constructor(defaultConfirmResult?: IConfirmationResult | undefined, defaultPromptResult?: IPromptResult<any> | undefined);
    private confirmResult;
    setConfirmResult(result: IConfirmationResult): void;
    confirm(confirmation: IConfirmation): Promise<IConfirmationResult>;
    prompt<T>(prompt: IPromptWithCustomCancel<T>): Promise<IPromptResultWithCancel<T>>;
    prompt<T>(prompt: IPromptWithDefaultCancel<T>): Promise<IPromptResult<T>>;
    prompt<T>(prompt: IPrompt<T>): Promise<IPromptResult<T>>;
    info(message: string, detail?: string): Promise<void>;
    warn(message: string, detail?: string): Promise<void>;
    error(message: string, detail?: string): Promise<void>;
    input(): Promise<IInputResult>;
    about(): Promise<void>;
}
