import { ITextModel } from '../../../../../../../../editor/common/model.js';
import { ObjectStream } from './objectStream.js';
import { VSBuffer } from '../../../../../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../../../../../base/common/cancellation.js';
/**
 * Create new instance of the stream from a provided text model.
 */
export declare function objectStreamFromTextModel(model: ITextModel, cancellationToken?: CancellationToken): ObjectStream<VSBuffer>;
