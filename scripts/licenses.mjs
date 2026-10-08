import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const lock=JSON.parse(readFileSync('package-lock.json','utf8'));
const entries=Object.entries(lock.packages).filter(([path])=>path).map(([path,pkg])=>{
  const packagePath=resolve(path,'package.json');
  const installed=existsSync(packagePath)?JSON.parse(readFileSync(packagePath,'utf8')):undefined;
  const fallback=installed?.licenses?.map(x=>x.type).join(' OR ');
  return {name:pkg.name??path.split('node_modules/').at(-1),version:pkg.version,license:pkg.license??installed?.license??fallback??'REVIEW_REQUIRED',dev:!!pkg.dev,optional:!!pkg.optional,path};
});
const missing=entries.filter(e=>e.license==='REVIEW_REQUIRED');
if(missing.length)throw new Error(`Missing license metadata: ${missing.map(x=>x.name).join(', ')}`);
writeFileSync('dependencies/license-inventory.json',JSON.stringify({lockfileSha256:createHash('sha256').update(readFileSync('package-lock.json')).digest('hex'),entries},null,2)+'\n');
writeFileSync('dependencies/LICENSES.md','# Dependency license inventory\n\nGenerated from pinned package-lock.json and installed package metadata. Includes optional platform packages. Package licenses remain with their packages; review packaging/notices at T-077. Node.js22 uses built-in experimental node:sqlite; no extra SQLite npm driver.\n\n| Package | Version | License | Scope |\n|---|---|---|---|\n'+entries.map(e=>`| ${e.name} | ${e.version} | ${e.license} | ${e.dev?'dev':'runtime'}${e.optional?' / optional':''} |`).join('\n')+'\n');
console.log(JSON.stringify({packages:entries.length,missingLicenses:missing.length,result:'PASS'}));
