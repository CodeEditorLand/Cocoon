var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { Data } from "effect";
class ActiveEditorNotFoundError extends Data.TaggedError(
  "ActiveEditorNotFoundError"
) {
  static {
    __name(this, "ActiveEditorNotFoundError");
  }
  constructor(Properties) {
    super(Properties ?? {});
    this.message = "No active text editor found. Please open a file to process.";
  }
  message;
}
class ProcessingServiceError extends Data.TaggedError(
  "ProcessingServiceError"
) {
  static {
    __name(this, "ProcessingServiceError");
  }
  constructor(Properties) {
    super(Properties);
    const CauseMessage = this.cause instanceof Error ? this.cause.message : String(this.cause);
    this.message = `Failed to connect to the processing service: ${CauseMessage}`;
  }
  message;
}
export {
  ActiveEditorNotFoundError,
  ProcessingServiceError
};
//# sourceMappingURL=Error.js.map
