import { ISingleEditOperation } from '../../../common/core/editOperation.js';
import { TextModel } from '../../../common/model/textModel.js';
export declare function testApplyEditsWithSyncedModels(original: string[], edits: ISingleEditOperation[], expected: string[], inputEditsAreInvalid?: boolean): void;
export declare function assertSyncedModels(text: string, callback: (model: TextModel, assertMirrorModels: () => void) => void, setup?: ((model: TextModel) => void) | null): void;
