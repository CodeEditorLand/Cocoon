import { IEditorOptions } from '../../../common/config/editorOptions.js';
import { TextModel } from '../../../common/model/textModel.js';
import { ViewModel } from '../../../common/viewModel/viewModelImpl.js';
export declare function testViewModel(text: string[], options: IEditorOptions, callback: (viewModel: ViewModel, model: TextModel) => void): void;
