const fs=require('fs');
const files=fs.readdirSync('src/data/manyShot').filter(f=>f.endsWith('Scenes.js'));
for(const f of files){
  let src=fs.readFileSync('src/data/manyShot/'+f,'utf8');
  src=src.replace(/export const /g,'exports.');
  const m={exports:{}};
  try{ new Function('exports','module',src)(m.exports,m); }catch(e){ console.log(f,'ERR',e.message); continue; }
  for(const k of Object.keys(m.exports)){
    const v=m.exports[k];
    if(Array.isArray(v)&&typeof v[0]==='string'){
      const lens=v.map(s=>s.split(/\s+/).filter(Boolean).length).sort((a,b)=>a-b);
      const sum=lens.reduce((a,b)=>a+b,0);
      const first15=v.slice(0,15).reduce((a,s)=>a+s.split(/\s+/).filter(Boolean).length,0);
      console.log(f.padEnd(30),k.padEnd(30),'n='+v.length,'mean='+Math.round(sum/v.length),'min='+lens[0],'med='+lens[Math.floor(lens.length/2)],'max='+lens[lens.length-1],'first15total='+first15);
    }
  }
}
