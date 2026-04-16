/**
 * @module Utility/Result
 * @description Simple Result type for IPC handler error propagation.
 */

export type Ok<T> = { readonly success: true; readonly value: T };
export type Err<E = Error> = { readonly success: false; readonly error: E };
export type Result<T, E = Error> = Ok<T> | Err<E>;

export const Result = {
	Ok: <T>(Value: T): Ok<T> => ({ success: true, value: Value }),
	Err: <E>(Error: E): Err<E> => ({ success: false, error: Error }),
	IsOk: <T, E>(R: Result<T, E>): R is Ok<T> => R.success,
	IsErr: <T, E>(R: Result<T, E>): R is Err<E> => !R.success,
};

export const Ok = Result.Ok;
export const Err = Result.Err;

export default Result;
