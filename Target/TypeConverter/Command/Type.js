var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
class APICommandArgument {
  constructor(Name, Description, Validate, Convert) {
    this.Name = Name;
    this.Description = Description;
    this.Validate = Validate;
    this.Convert = Convert;
  }
  static {
    __name(this, "APICommandArgument");
  }
}
class APICommandResult {
  constructor(Name, Convert) {
    this.Name = Name;
    this.Convert = Convert;
  }
  static {
    __name(this, "APICommandResult");
  }
}
class APICommand {
  constructor(ID, InternalID, Description, Arguments, Result) {
    this.ID = ID;
    this.InternalID = InternalID;
    this.Description = Description;
    this.Arguments = Arguments;
    this.Result = Result;
  }
  static {
    __name(this, "APICommand");
  }
}
export {
  APICommand,
  APICommandArgument,
  APICommandResult
};
//# sourceMappingURL=Type.js.map
