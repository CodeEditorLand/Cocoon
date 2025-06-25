import { Position } from '../../../../common/core/position.js';
import { ITestCodeEditor, TestCodeEditorInstantiationOptions } from '../../../../test/browser/testCodeEditor.js';
export declare function deserializePipePositions(text: string): [string, Position[]];
export declare function serializePipePositions(text: string, positions: Position[]): string;
export declare function testRepeatedActionAndExtractPositions(text: string, initialPosition: Position, action: (editor: ITestCodeEditor) => void, record: (editor: ITestCodeEditor) => Position, stopCondition: (editor: ITestCodeEditor) => boolean, options?: TestCodeEditorInstantiationOptions): Position[];
