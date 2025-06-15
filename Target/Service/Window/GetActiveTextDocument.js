import{Effect as e,Option as o}from"effect";import i from"./Service.js";const n=e.gen(function*(){const t=yield*i;return o.fromNullable(t.activeTextEditor?.document)});var m=n;export{m as default};
