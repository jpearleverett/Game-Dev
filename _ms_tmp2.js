const fs=require('fs');
let src=fs.readFileSync('src/data/storyBible.js','utf8');
src=src.replace(/^export const /gm,'const ').replace(/export default[\s\S]*$/,'');
const names=[...src.matchAll(/^const ([A-Z_0-9]+) =/gm)].map(m=>m[1]);
src += "\nreturn {"+names.join(',')+"};";
let ex;
try{ ex=new Function(src)(); }catch(e){ console.log('ERR',e.message); process.exit(1);}
const wc=s=>String(s).split(/\s+/).filter(Boolean).length;
const ep=ex.EXAMPLE_PASSAGES||{};
let epT=0; for(const k of Object.keys(ep)){epT+=wc(ep[k]); console.log('EXAMPLE_PASSAGES.'+k, wc(ep[k]));}
console.log('EXAMPLE_PASSAGES total',epT);
const es=ex.EXTENDED_STYLE_GROUNDING||{};
let esT=0; for(const k of Object.keys(es)){esT+=wc(es[k]);console.log('EXT.'+k, wc(es[k]));}
console.log('EXT total',esT);
const ae=ex.ANNOTATED_EXAMPLES||{};
let aeTotal=0;
for(const k of Object.keys(ae)) { const t=wc(ae[k].passage)+wc((ae[k].annotations||[]).join(' ')); aeTotal+=t; }
console.log('ANNOTATED n='+Object.keys(ae).length,'total', aeTotal);
const ne=ex.NEGATIVE_EXAMPLES||{};
let neT=0; for(const k of Object.keys(ne)) neT+=wc(ne[k].badVersion)+wc(ne[k].goodVersion)+wc((ne[k].problems||[]).join(' '));
console.log('NEGATIVE total', neT);
console.log('--- GENERATION_CONFIG ---'); console.log(JSON.stringify(ex.GENERATION_CONFIG,null,1));
console.log('--- ABSOLUTE_FACTS ---'); console.log(JSON.stringify(ex.ABSOLUTE_FACTS,null,1));
console.log('--- REVEAL_TIMING ---'); console.log(JSON.stringify(ex.REVEAL_TIMING,null,1));
console.log('--- WRITING_STYLE ---'); console.log(JSON.stringify(ex.WRITING_STYLE,null,1).slice(0,4000));
console.log('=== SCENE_REQ interpolations ===');
console.log('MICRO elements?', Array.isArray(ex.MICRO_TENSION_TECHNIQUES?.elements), JSON.stringify(ex.MICRO_TENSION_TECHNIQUES,null,1));
console.log('sensory find =>', ex.MICRO_TENSION_TECHNIQUES?.elements?.find(e=>e.includes('sensory')));
console.log('micro =>', ex.ENGAGEMENT_REQUIREMENTS?.revelationGradient?.levels?.micro);
console.log('finalLineHook.description =>', ex.ENGAGEMENT_REQUIREMENTS?.finalLineHook?.description);
console.log('personalStakes.requirement =>', ex.ENGAGEMENT_REQUIREMENTS?.personalStakes?.requirement);
console.log('emotionalAnchor.rule =>', ex.ENGAGEMENT_REQUIREMENTS?.emotionalAnchor?.rule);
console.log('SENTENCE_RHYTHM.rules[0] =>', ex.SENTENCE_RHYTHM?.rules?.[0]);
console.log('=== CONSISTENCY_RULES ===');
console.log(JSON.stringify(ex.CONSISTENCY_RULES,null,1));
