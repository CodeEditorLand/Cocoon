import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ICodeEditor } from '../../../../browser/editorBrowser.js';
export interface ITextModelChangeRecorderMetadata {
    source?: string;
    extensionId?: string;
    nes?: boolean;
    type?: 'word' | 'line';
}
export declare class TextModelChangeRecorder extends Disposable {
    private readonly _editor;
    private readonly _instantiationService;
    private readonly _structuredLogger;
    constructor(_editor: ICodeEditor, _instantiationService: IInstantiationService);
}
