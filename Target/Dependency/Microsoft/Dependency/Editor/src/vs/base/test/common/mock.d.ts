import { SinonStub } from 'sinon';
export interface Ctor<T> {
    new (): T;
}
export declare function mock<T>(): Ctor<T>;
export type MockObject<T, ExceptProps = never> = {
    [K in keyof T]: K extends ExceptProps ? T[K] : SinonStub;
};
export declare const mockObject: <T extends object>() => <TP extends Partial<T> = {}>(properties?: TP) => MockObject<T, keyof TP>;
