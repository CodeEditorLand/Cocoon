/**
 * Mocks an `TObject` with the provided `overrides`.
 *
 * If you need to mock an `Service`, please use {@link mockService}
 * instead which provides better type safety guarantees for the case.
 *
 * @throws Reading non-overridden property or function on `TObject` throws an error.
 */
export declare function mockObject<TObject extends object>(overrides: Partial<TObject>): TObject;
/**
 * Type for any service.
 */
type TAnyService = {
    readonly _serviceBrand: undefined;
};
/**
 * Mocks provided service with the provided `overrides`.
 * Same as more generic {@link mockObject} utility, but with
 * the service constraint on the `TService` type.
 *
 * @throws Reading non-overridden property or function
 * 		   on `TService` throws an error.
 */
export declare function mockService<TService extends TAnyService>(overrides: Partial<TService>): TService;
export {};
