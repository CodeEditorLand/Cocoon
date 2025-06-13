var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class ActiveEditorNotFoundError extends Data.TaggedError(
  "ActiveEditorNotFoundError"
) {
  static {
    __name(this, "ActiveEditorNotFoundError");
  }
  message = "No active text editor found. Please open a file to process.";
}
class ProcessingServiceError extends Data.TaggedError(
  "ProcessingServiceError"
) {
  static {
    __name(this, "ProcessingServiceError");
  }
  get message() {
    const causeMessage = this.cause instanceof Error ? this.cause.message : String(this.cause);
    return `Failed to connect to the processing service: ${causeMessage}`;
  }
}
export {
  ActiveEditorNotFoundError,
  ProcessingServiceError
};
//# sourceMappingURL=Error.js.map
