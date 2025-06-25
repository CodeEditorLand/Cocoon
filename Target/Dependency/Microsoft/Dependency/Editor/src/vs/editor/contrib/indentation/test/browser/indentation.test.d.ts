import { IDisposable } from '../../../../../base/common/lifecycle.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { StandardTokenType } from '../../../../common/encodedTokenAttributes.js';
import { ILanguageService } from '../../../../common/languages/language.js';
export declare enum Language {
    TypeScript = "ts-test",
    Ruby = "ruby-test",
    PHP = "php-test",
    Go = "go-test",
    CPP = "cpp-test",
    HTML = "html-test",
    VB = "vb-test",
    Latex = "latex-test",
    Lua = "lua-test"
}
export declare function registerLanguage(languageService: ILanguageService, language: Language): IDisposable;
export declare function registerLanguageConfiguration(languageConfigurationService: ILanguageConfigurationService, language: Language): IDisposable;
export interface StandardTokenTypeData {
    startIndex: number;
    standardTokenType: StandardTokenType;
}
export declare function registerTokenizationSupport(instantiationService: TestInstantiationService, tokens: StandardTokenTypeData[][], languageId: Language): IDisposable;
