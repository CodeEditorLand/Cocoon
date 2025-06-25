import { ITopError } from './types.js';
/**
 * The top-most error of the reference tree.
 */
export declare class TopError implements ITopError {
    readonly originalError: ITopError['originalError'];
    readonly errorSubject: ITopError['errorSubject'];
    readonly errorsCount: ITopError['errorsCount'];
    readonly parentUri: ITopError['parentUri'];
    constructor(options: Omit<ITopError, 'localizedMessage'>);
    get localizedMessage(): string;
}
