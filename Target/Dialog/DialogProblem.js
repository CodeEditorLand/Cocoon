import{Data as o}from"effect";class a extends o.TaggedError("DialogProblem"){message;constructor(e){super(e),this.message=`Dialog operation failed: ${this.Context}`}}export{a as DialogProblem};
