import { TextEditInfo } from '../../../../common/model/bracketPairsTextModelPart/bracketPairsTree/beforeEditPositionMapper.js';
import { Length } from '../../../../common/model/bracketPairsTextModelPart/bracketPairsTree/length.js';
export declare class TextEdit extends TextEditInfo {
    readonly newText: string;
    constructor(startOffset: Length, endOffset: Length, newText: string);
}
