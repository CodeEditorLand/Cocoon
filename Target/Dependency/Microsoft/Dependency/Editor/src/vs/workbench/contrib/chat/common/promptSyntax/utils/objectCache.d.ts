import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ObservableDisposable } from './observableDisposable.js';
/**
 * Generic cache for object instances. Guarantees to return only non-disposed
 * objects from the {@linkcode get} method. If a requested object is not yet
 * in the cache or is disposed already, the {@linkcode factory} callback is
 * called to create a new object.
 *
 * @throws if {@linkcode factory} callback returns a disposed object.
 *
 * ## Examples
 *
 * ```typescript
 * // a class that will be used as a cache key; the key can be of any
 * // non-nullable type, including primitives like `string` or `number`,
 * // but in this case we use an object pointer as a key
 * class KeyObject {}
 *
 * // a class for testing purposes
 * class TestObject extends ObservableDisposable {
 *   constructor(
 *     public readonly id: KeyObject,
 *   ) {}
 * };
 *
 * // create an object cache instance providing it a factory function that
 * // is responsible for creating new objects based on the provided key if
 * // the cache does not contain the requested object yet or an existing
 * // object is already disposed
 * const cache = new ObjectCache<TestObject, KeyObject>((key) => {
 *   // create a new test object based on the provided key
 *   return new TestObject(key);
 * });
 *
 * // create two keys
 * const key1 = new KeyObject();
 * const key2 = new KeyObject();
 *
 * // get an object from the cache by its key
 * const object1 = cache.get(key1); // returns a new test object
 *
 * // validate that the new object has the correct key
 * assert(
 *   object1.id === key1,
 *   'Object 1 must have correct ID.',
 * );
 *
 * // returns the same cached test object
 * const object2 = cache.get(key1);
 *
 * // validate that the same exact object is returned from the cache
 * assert(
 *   object1 === object2,
 *   'Object 2 the same cached object as object 1.',
 * );
 *
 * // returns a new test object
 * const object3 = cache.get(key2);
 *
 * // validate that the new object has the correct key
 * assert(
 *   object3.id === key2,
 *   'Object 3 must have correct ID.',
 * );
 *
 * assert(
 *   object3 !== object1,
 *   'Object 3 must be a new object.',
 * );
 * ```
 */
export declare class ObjectCache<TValue extends ObservableDisposable, TKey extends NonNullable<unknown> = string> extends Disposable {
    private readonly factory;
    private readonly cache;
    constructor(factory: (key: TKey) => TValue & {
        isDisposed: false;
    });
    /**
     * Get an existing object from the cache. If a requested object is not yet
     * in the cache or is disposed already, the {@linkcode factory} callback is
     * called to create a new object.
     *
     * @throws if {@linkcode factory} callback returns a disposed object.
     * @param key - ID of the object in the cache
     */
    get(key: TKey): TValue & {
        isDisposed: false;
    };
    /**
     * Remove an object from the cache by its key.
     *
     * @param key ID of the object to remove.
     * @param dispose Whether the removed object must be disposed.
     */
    remove(key: TKey, dispose: boolean): this;
}
