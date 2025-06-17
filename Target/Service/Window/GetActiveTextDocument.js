import{Effect as t,Option as e}from"effect";import i from"./Service.js";var f=t.gen(function*(){const o=yield*i;return e.fromNullable(o.activeTextEditor?.document)});export{f as default};
