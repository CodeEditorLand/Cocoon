import { TextEditInfo } from '../../../../common/model/bracketPairsTextModelPart/bracketPairsTree/beforeEditPositionMapper.js';
import { TextModel } from '../../../../common/model/textModel.js';
import { Random } from '../../core/random.js';
export declare function getRandomEditInfos(textModel: TextModel, count: number, rng: Random, disjoint?: boolean): TextEditInfo[];
