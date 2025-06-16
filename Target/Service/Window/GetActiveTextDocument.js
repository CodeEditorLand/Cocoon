import{Effect as t,Option as o}from"effect";import n from"./Service.js";const i=t.gen(function*(){const e=yield*n;return o.fromNullable(e.activeTextEditor?.document)});var f=i;export{f as default};
