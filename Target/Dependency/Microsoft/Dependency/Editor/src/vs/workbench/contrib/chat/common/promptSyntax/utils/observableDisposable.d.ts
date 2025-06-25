import { Disposable, IDisposable } from '../../../../../../base/common/lifecycle.js';
/**
* @deprecated do not use this, https://github.com/microsoft/vscode/issues/248366
 */
export declare abstract class ObservableDisposable extends Disposable {
    /**
     * Underlying disposables store this object relies on.
     */
    private readonly store;
    /**
     * Check if the current object is already has been disposed.
     */
    get isDisposed(): boolean;
    /**
     * The event is fired when this object is disposed.
     * Note! Executes the callback immediately if already disposed.
     *
     * @param callback The callback function to be called on updates.
     */
    onDispose(callback: () => void): IDisposable;
    /**
     * Adds disposable object(s) to the list of disposables
     * that will be disposed with this object.
     */
    addDisposables(...disposables: IDisposable[]): this;
    /**
     * Assert that the current object was not yet disposed.
     *
     * @throws If the current object was already disposed.
     * @param error Error message or error object to throw if assertion fails.
     */
    assertNotDisposed(error: string | Error): asserts this is TNotDisposed<this>;
}
/**
 * @deprecated do not use this, https://github.com/microsoft/vscode/issues/248366
 */
type TNotDisposed<TObject extends {
    isDisposed: boolean;
}> = TObject & {
    isDisposed: false;
};
/**
 * @deprecated do not use this, https://github.com/microsoft/vscode/issues/248366
 */
export declare function assertNotDisposed<TObject extends {
    isDisposed: boolean;
}>(object: TObject, error: string | Error): asserts object is TNotDisposed<TObject>;
export {};
