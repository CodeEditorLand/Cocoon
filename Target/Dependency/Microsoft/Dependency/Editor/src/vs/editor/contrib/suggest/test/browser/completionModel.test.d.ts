import { IPosition } from '../../../../common/core/position.js';
import * as languages from '../../../../common/languages.js';
import { CompletionItem } from '../../browser/suggest.js';
export declare function createSuggestItem(label: string | languages.CompletionItemLabel, overwriteBefore: number, kind?: languages.CompletionItemKind, incomplete?: boolean, position?: IPosition, sortText?: string, filterText?: string): CompletionItem;
