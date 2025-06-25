import { SimpleCompletionModel, type LineContext } from '../../../../services/suggest/browser/simpleCompletionModel.js';
import { type TerminalCompletionItem } from './terminalCompletionItem.js';
export declare class TerminalCompletionModel extends SimpleCompletionModel<TerminalCompletionItem> {
    constructor(items: TerminalCompletionItem[], lineContext: LineContext);
}
