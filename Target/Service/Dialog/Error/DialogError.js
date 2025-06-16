import{Data as e}from"effect";class o extends e.TaggedError("DialogError"){constructor(r){super(r),this.message=`Dialog operation failed: ${this.context}`}message}export{o as default};
