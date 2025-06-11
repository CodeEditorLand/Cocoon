var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
class ApiCommandArgument {
  constructor(Name, Description, Validate, Convert) {
    this.Name = Name;
    this.Description = Description;
    this.Validate = Validate;
    this.Convert = Convert;
  }
  static {
    __name(this, "ApiCommandArgument");
  }
}
class ApiCommandResult {
  constructor(Name, Convert) {
    this.Name = Name;
    this.Convert = Convert;
  }
  static {
    __name(this, "ApiCommandResult");
  }
}
class ApiCommand {
  constructor(Id, InternalId, Description, Argument, Result) {
    this.Id = Id;
    this.InternalId = InternalId;
    this.Description = Description;
    this.Argument = Argument;
    this.Result = Result;
  }
  static {
    __name(this, "ApiCommand");
  }
}
export {
  ApiCommand,
  ApiCommandArgument,
  ApiCommandResult
};
//# sourceMappingURL=Type.js.map
