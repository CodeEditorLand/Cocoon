import { IReaderWithStore, IReader, IObservable } from '../base.js';
import { IChangeTracker } from '../changeTracker.js';
import { DisposableStore, IDisposable } from '../commonFacade/deps.js';
import { IDebugNameData } from '../debugName.js';
/**
 * Runs immediately and whenever a transaction ends and an observed observable changed.
 * {@link fn} should start with a JS Doc using `@description` to name the autorun.
 */
export declare function autorun(fn: (reader: IReaderWithStore) => void): IDisposable;
/**
 * Runs immediately and whenever a transaction ends and an observed observable changed.
 * {@link fn} should start with a JS Doc using `@description` to name the autorun.
 */
export declare function autorunOpts(options: IDebugNameData & {}, fn: (reader: IReaderWithStore) => void): IDisposable;
/**
 * Runs immediately and whenever a transaction ends and an observed observable changed.
 * {@link fn} should start with a JS Doc using `@description` to name the autorun.
 *
 * Use `changeTracker.createChangeSummary` to create a "change summary" that can collect the changes.
 * Use `changeTracker.handleChange` to add a reported change to the change summary.
 * The run function is given the last change summary.
 * The change summary is discarded after the run function was called.
 *
 * @see autorun
 */
export declare function autorunHandleChanges<TChangeSummary>(options: IDebugNameData & {
    changeTracker: IChangeTracker<TChangeSummary>;
}, fn: (reader: IReader, changeSummary: TChangeSummary) => void): IDisposable;
/**
 * @see autorunHandleChanges (but with a disposable store that is cleared before the next run or on dispose)
 */
export declare function autorunWithStoreHandleChanges<TChangeSummary>(options: IDebugNameData & {
    changeTracker: IChangeTracker<TChangeSummary>;
}, fn: (reader: IReader, changeSummary: TChangeSummary, store: DisposableStore) => void): IDisposable;
/**
 * @see autorun (but with a disposable store that is cleared before the next run or on dispose)
 *
 * @deprecated Use `autorun(reader => { reader.store.add(...) })` instead!
 */
export declare function autorunWithStore(fn: (reader: IReader, store: DisposableStore) => void): IDisposable;
export declare function autorunDelta<T>(observable: IObservable<T>, handler: (args: {
    lastValue: T | undefined;
    newValue: T;
}) => void): IDisposable;
export declare function autorunIterableDelta<T>(getValue: (reader: IReader) => Iterable<T>, handler: (args: {
    addedValues: T[];
    removedValues: T[];
}) => void, getUniqueIdentifier?: (value: T) => unknown): IDisposable;
