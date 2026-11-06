// The live record. Once a day, after the close: for every scoreboard market, write the close and every strategy's
// position at that close, chained by fingerprint so a quiet edit shows. Append only; never rewrites a day.
// Run: node tools/record_day.js            (writes data/record.json)
const fs=require("fs"),path=require("path"),vm=require("vm"),crypto=require("crypto");
const HERE=path.join(__dirname,"..");
const ctx={};vm.runInNewContext(fs.readFileSync(path.join(HERE,"assets/engine.js"),"utf8"),ctx);const E=ctx.E;
const MK=["BTC-USD","ETH-USD","BNB-USD","XRP-USD","SOL-USD","TRX-USD","DOGE-USD","ADA-USD","LINK-USD","AAPL","NVDA","MSFT","GOOGL","AMZN","META","TSLA","SPY","PETR4.SA","BOVA11.SA"];
const OUT=path.join(HERE,"data/record.json");
const sha=s=>crypto.createHash("sha256").update(s).digest("hex");
const catKey=c=>c.k+":"+JSON.stringify(c.p);
const catFp=sha(E.CAT.map(catKey).join("\n")).slice(0,16);
async function series(sym){
  const u="https://query1.finance.yahoo.com/v8/finance/chart/"+encodeURIComponent(sym)+"?range=10y&interval=1d&events=div%2Csplit";
  let r=null;for(let a=0;a<5;a++){try{r=await fetch(u,{headers:{"user-agent":"Mozilla/5.0 (compatible; Prova/1.0)","accept":"application/json"}});if(r.ok)break}catch(e){r=null}await new Promise(z=>setTimeout(z,2500*(a+1)))}
  if(!r||!r.ok)throw new Error("price "+(r?r.status:"unreachable"));
  const res=(await r.json()).chart.result[0],ac=res.indicators.adjclose&&res.indicators.adjclose[0].adjclose,cl=ac||res.indicators.quote[0].close,m={};
  res.timestamp.forEach((t,i)=>{const v=cl[i];if(v==null||!(v>0))return;m[new Date(t*1000).toISOString().slice(0,10)]=v});
  const today=new Date().toISOString().slice(0,10);delete m[today]; // a bar dated today is still open; only closed days go in the record
  const d=Object.keys(m).sort();return{d:d,p:d.map(x=>+m[x].toFixed(4))}}
(async()=>{
  let rec={since:null,cat:catFp,pool:E.CAT.length,note:"One row per market per day. pos: one character per strategy in catalog order, 1 = holding, 0 = out, 5 = half in. h = sha256(previous h + '|' + date + sym + close + pos).",rows:[]};
  if(fs.existsSync(OUT)){rec=JSON.parse(fs.readFileSync(OUT,"utf8"));if(rec.cat!==catFp){console.log("catalog changed: "+rec.cat+" -> "+catFp+"; rows keep their own cat");}}
  rec.cat=catFp;rec.pool=E.CAT.length;
  const today=new Date().toISOString().slice(0,10);let added=0;
  for(const sym of MK){
    let s;try{s=await series(sym)}catch(e){console.log("skip",sym,e.message);continue}
    const n=s.d.length,prev=rec.rows.filter(r=>r.sym===sym).slice(-1)[0];
    // every closed day after the last recorded one (Yahoo sometimes fills a day late, so a run can add two)
    const p2=s.p.concat([s.p[n-1]]),d2=s.d.concat([s.d[n-1]]);
    const PZ=E.CAT.map(c=>E.positions({kind:c.k,p:c.p,name:sym,sym:sym},p2,d2));
    let ph=prev?prev.h:"",from=prev?s.d.indexOf(prev.d)+1:n-1;if(from<=0)from=n-1;
    for(let i=from;i<n;i++){
      let pos="";for(let k=0;k<PZ.length;k++){const v=PZ[k][i];pos+=v===1?"1":(v===0.5?"5":"0")}
      const row={d:s.d[i],sym:sym,c:s.p[i],cat:catFp,pos:pos,h:sha(ph+"|"+s.d[i]+sym+s.p[i]+pos)};ph=row.h;
      rec.rows.push(row);added++;console.log("add",sym,s.d[i],s.p[i],"in:"+(pos.match(/1/g)||[]).length)}
    if(from>=n)console.log("have",sym,s.d[n-1]);
  }
  if(!rec.since&&rec.rows.length)rec.since=rec.rows.map(r=>r.d).sort()[0];
  rec.at=today;
  fs.writeFileSync(OUT,JSON.stringify(rec));console.log("wrote data/record.json rows",rec.rows.length,"added",added,"since",rec.since);
})();
