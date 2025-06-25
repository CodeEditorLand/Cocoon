import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { DebugModel } from '../../common/debugModel.js';
export declare const mockUriIdentityService: UriIdentityService;
export declare function createMockDebugModel(disposable: Pick<DisposableStore, 'add'>): DebugModel;
