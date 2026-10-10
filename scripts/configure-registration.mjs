import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const name = "SUPABASE_SERVER_SECRET_KEY";
const line = readFileSync(".env.local","utf8").split(/\r?\n/).find(l=>l.startsWith(name+"="));
if (!line) throw new Error("Missing server registration configuration");
const value=line.slice(name.length+1).trim();
const result=spawnSync("cmd.exe",["/d","/s","/c",`npx.cmd --yes vercel@63.1.2 env add ${name} production,preview --sensitive --yes`],{input:value+"\n",encoding:"utf8",timeout:120000});
if(result.status!==0) throw new Error("Could not configure Vercel server registration secret. Check project access.");
console.log("Server registration secret configured in Vercel; value hidden.");
