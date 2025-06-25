import { DisposableStore, IDisposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { BracketPairColorizationOptions, DefaultEndOfLine, ITextBufferFactory } from '../../common/model.js';
import { TextModel } from '../../common/model/textModel.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { ServiceIdCtorPair, TestInstantiationService } from '../../../platform/instantiation/test/common/instantiationServiceMock.js';
declare class TestTextModel extends TextModel {
    registerDisposable(disposable: IDisposable): void;
}
export declare function withEditorModel(text: string[], callback: (model: TextModel) => void): void;
export interface IRelaxedTextModelCreationOptions {
    tabSize?: number;
    indentSize?: number | 'tabSize';
    insertSpaces?: boolean;
    detectIndentation?: boolean;
    trimAutoWhitespace?: boolean;
    defaultEOL?: DefaultEndOfLine;
    isForSimpleWidget?: boolean;
    largeFileOptimizations?: boolean;
    bracketColorizationOptions?: BracketPairColorizationOptions;
}
export declare function createTextModel(text: string | ITextBufferFactory, languageId?: string | null, options?: IRelaxedTextModelCreationOptions, uri?: URI | null): TextModel;
export declare function instantiateTextModel(instantiationService: IInstantiationService, text: string | ITextBufferFactory, languageId?: string | null, _options?: IRelaxedTextModelCreationOptions, uri?: URI | null): TestTextModel;
export declare function createModelServices(disposables: DisposableStore, services?: ServiceIdCtorPair<any>[]): TestInstantiationService;
export {};
