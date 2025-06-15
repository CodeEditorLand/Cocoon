import{Layer as o}from"effect";import i from"../IPC/Live.js";import t from"./Definition.js";import e from"./Service.js";function s(r){return o.effect(e,t).pipe(o.provide(i(r)))}export{s as default};
