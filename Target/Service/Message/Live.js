import{Layer as i}from"effect";import{Live as r}from"../IPC.js";import e from"./Definition.js";import t from"./Service.js";const f=o=>i.effect(t,e).pipe(i.provide(r(o)));var v=f;export{v as default};
