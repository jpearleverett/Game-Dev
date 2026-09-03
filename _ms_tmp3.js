const fs=require('fs');
let src=fs.readFileSync('src/data/storyBible.js','utf8');
src=src.replace(/^export const /gm,'const ').replace(/export default[\s\S]*$/,'');
const names=[...src.matchAll(/^const ([A-Z_0-9]+) =/gm)].map(m=>m[1]);
const ex=new Function(src+"\nreturn {"+names.join(',')+"};")();
const count=(s,re)=>((String(s).match(re)||[]).length);
let total=0;
console.log('--- EM DASH in EXAMPLE_PASSAGES (injected as EXCELLENT) ---');
for(const k of Object.keys(ex.EXAMPLE_PASSAGES)){const c=count(ex.EXAMPLE_PASSAGES[k],/—/g); total+=c; if(c)console.log(' ',k,c);}
console.log('--- EM DASH in EXTENDED_STYLE_GROUNDING ---');
for(const k of Object.keys(ex.EXTENDED_STYLE_GROUNDING)){const c=count(ex.EXTENDED_STYLE_GROUNDING[k],/—/g); total+=c; if(c)console.log(' ',k,c);}
console.log('--- EM DASH in ANNOTATED_EXAMPLES.passage ---');
for(const k of Object.keys(ex.ANNOTATED_EXAMPLES)){const c=count(ex.ANNOTATED_EXAMPLES[k].passage,/—/g); total+=c; if(c)console.log(' ',k,c);}
console.log('TOTAL em dashes in injected style exemplars:',total);
console.log('--- OCR hyphen-linebreaks in dialogueExample ---');
console.log(JSON.stringify((ex.EXAMPLE_PASSAGES.dialogueExample.match(/[a-z]-\n[a-z]+/g)||[])));
console.log('first char of dialogueExample:',JSON.stringify(ex.EXAMPLE_PASSAGES.dialogueExample.slice(0,20)));
console.log('--- profanity in exemplars ---');
const all=[...Object.values(ex.EXAMPLE_PASSAGES),...Object.values(ex.EXTENDED_STYLE_GROUNDING),...Object.values(ex.ANNOTATED_EXAMPLES).map(a=>a.passage)].join('\n');
console.log('fuck*',count(all,/fuck/gi),'shit',count(all,/shit/gi),'murder',count(all,/murder/gi));
console.log('--- NEGATIVE problems strings not in badVersion ---');
for(const k of Object.keys(ex.NEGATIVE_EXAMPLES)){
  const n=ex.NEGATIVE_EXAMPLES[k];
  (n.problems||[]).forEach(p=>{
    const m=p.match(/"([^"]{4,})"/);
    if(m && !n.badVersion.includes(m[1])) console.log('  MISMATCH',k,'::',p);
  });
}
