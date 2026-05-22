const t=".fiddee";function n(){const e=process.env.HOME??process.env.USERPROFILE??null;return typeof e=="string"&&e.length>0?`${e}/${t}`:t}export{t as DotfileName,n as default};
