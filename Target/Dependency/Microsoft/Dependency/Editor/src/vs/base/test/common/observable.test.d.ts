import { IObservableWithChange, IObservable, IObserver, ISettableObservable, ITransaction } from '../../common/observable.js';
import { BaseObservable } from '../../common/observableInternal/observables/baseObservable.js';
export declare class LoggingObserver implements IObserver {
    readonly debugName: string;
    private readonly log;
    private count;
    constructor(debugName: string, log: Log);
    beginUpdate<T>(observable: IObservable<T>): void;
    endUpdate<T>(observable: IObservable<T>): void;
    handleChange<T, TChange>(observable: IObservableWithChange<T, TChange>, change: TChange): void;
    handlePossibleChange<T>(observable: IObservable<T>): void;
}
export declare class LoggingObservableValue<T, TChange = void> extends BaseObservable<T, TChange> implements ISettableObservable<T, TChange> {
    readonly debugName: string;
    private readonly logger;
    private value;
    constructor(debugName: string, initialValue: T, logger: Log);
    protected onFirstObserverAdded(): void;
    protected onLastObserverRemoved(): void;
    get(): T;
    set(value: T, tx: ITransaction | undefined, change: TChange): void;
    toString(): string;
}
declare class Log {
    private readonly entries;
    log(message: string): void;
    getAndClearEntries(): string[];
}
export {};
