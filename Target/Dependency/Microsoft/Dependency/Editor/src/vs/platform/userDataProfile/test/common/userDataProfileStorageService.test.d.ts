import { Event } from '../../../../base/common/event.js';
import { InMemoryStorageDatabase } from '../../../../base/parts/storage/common/storage.js';
import { AbstractUserDataProfileStorageService, IUserDataProfileStorageService } from '../../common/userDataProfileStorageService.js';
import { IUserDataProfile } from '../../common/userDataProfile.js';
export declare class TestUserDataProfileStorageService extends AbstractUserDataProfileStorageService implements IUserDataProfileStorageService {
    readonly onDidChange: Event<any>;
    private databases;
    protected createStorageDatabase(profile: IUserDataProfile): Promise<InMemoryStorageDatabase>;
    setupStorageDatabase(profile: IUserDataProfile): Promise<InMemoryStorageDatabase>;
}
