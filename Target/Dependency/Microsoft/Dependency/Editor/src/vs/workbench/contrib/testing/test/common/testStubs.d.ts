import { URI } from '../../../../../base/common/uri.js';
import { MainThreadTestCollection } from '../../common/mainThreadTestCollection.js';
import { ITestItem, TestsDiff } from '../../common/testTypes.js';
import { TestId } from '../../common/testId.js';
import { ITestItemApi, ITestItemChildren, ITestItemLike, TestItemCollection } from '../../common/testItemCollection.js';
export declare class TestTestItem implements ITestItemLike {
    private readonly _extId;
    private readonly props;
    private _canResolveChildren;
    get tags(): {
        id: string;
    }[];
    set tags(value: {
        id: string;
    }[]);
    get canResolveChildren(): boolean;
    set canResolveChildren(value: boolean);
    get parent(): TestTestItem | undefined;
    get id(): string | undefined;
    api: ITestItemApi<TestTestItem>;
    children: ITestItemChildren<TestTestItem>;
    constructor(_extId: TestId, label: string, uri?: URI);
    get<K extends keyof ITestItem>(key: K): ITestItem[K];
    set<K extends keyof ITestItem>(key: K, value: ITestItem[K]): void;
    toTestItem(): ITestItem;
}
export declare class TestTestCollection extends TestItemCollection<TestTestItem> {
    constructor(controllerId?: string);
    get currentDiff(): TestsDiff;
    setDiff(diff: TestsDiff): void;
}
/**
 * Gets a main thread test collection initialized with the given set of
 * roots/stubs.
 */
export declare const getInitializedMainTestCollection: (singleUse?: TestTestCollection) => Promise<MainThreadTestCollection>;
type StubTreeIds = Readonly<{
    [id: string]: StubTreeIds | undefined;
}>;
export declare const makeSimpleStubTree: (ids: StubTreeIds) => TestTestCollection;
export declare const testStubs: {
    nested: (idPrefix?: string) => TestTestCollection;
};
export {};
