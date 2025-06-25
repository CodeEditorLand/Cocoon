import { IDisposable } from '../../../../base/common/lifecycle.js';
import { IObservableWithChange } from '../../../../base/common/observable.js';
export declare function onObservableChange<T>(observable: IObservableWithChange<unknown, T>, callback: (value: T) => void): IDisposable;
