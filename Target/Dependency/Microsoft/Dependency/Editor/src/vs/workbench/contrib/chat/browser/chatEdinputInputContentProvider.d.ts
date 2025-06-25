import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { ITextModel } from '../../../../editor/common/model.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelContentProvider, ITextModelService } from '../../../../editor/common/services/resolverService.js';
export declare class ChatInputBoxContentProvider extends Disposable implements ITextModelContentProvider {
    private readonly modelService;
    private readonly languageService;
    constructor(textModelService: ITextModelService, modelService: IModelService, languageService: ILanguageService);
    provideTextContent(resource: URI): Promise<ITextModel | null>;
}
