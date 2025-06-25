import { CancellationToken } from '../../../common/cancellation.js';
import { IRequestContext, IRequestOptions } from './request.js';
export declare function request(options: IRequestOptions, token: CancellationToken, isOnline?: () => boolean): Promise<IRequestContext>;
