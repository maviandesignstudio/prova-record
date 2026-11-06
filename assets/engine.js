/* Prova engine. Rules are state machines on daily closes. The position held at close i earns close i to i+1, so nothing looks ahead. Costs hit every switch. */
(function(root){
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function refVal(p,i,ref,m){if(i<m)return null;var s=0,hi=-1e18,lo=1e18;for(var j=i-m;j<i;j++){var v=p[j];s+=v;if(v>hi)hi=v;if(v<lo)lo=v}return ref==="avg"?s/m:(ref==="high"?hi:lo)}
function smaArr(p,N){var n=p.length,o=new Array(n).fill(null),s=0;for(var i=0;i<n;i++){s+=p[i];if(i>=N)s-=p[i-N];if(i>=N-1)o[i]=s/N}return o}
function rsiArr(p,N){var n=p.length,o=new Array(n).fill(null),g=0,l=0;for(var i=1;i<=N&&i<n;i++){var d=p[i]-p[i-1];if(d>0)g+=d;else l-=d}g/=N;l/=N;if(n>N)o[N]=l===0?100:100-100/(1+g/l);for(var j=N+1;j<n;j++){var dd=p[j]-p[j-1],up=dd>0?dd:0,dn=dd<0?-dd:0;g=(g*(N-1)+up)/N;l=(l*(N-1)+dn)/N;o[j]=l===0?100:100-100/(1+g/l)}return o}
function volArr(p,N){var n=p.length,o=new Array(n).fill(null),r=[0];for(var i=1;i<n;i++)r.push(p[i]/p[i-1]-1);for(var k=N;k<n;k++){var s=0,q=0;for(var j=k-N+1;j<=k;j++){s+=r[j];q+=r[j]*r[j]}var m=s/N;o[k]=Math.sqrt(Math.max(0,q/N-m*m))}return o}
/* one condition: {s:avg|high|low|rsi|chg, c:above|below, n, v} */
function evalCond(c,p,i,ctx){
  if(c.s==="rsi"){if(!ctx.rsi)ctx.rsi=rsiArr(p,14);var r=ctx.rsi[i];if(r===null||r===undefined)return false;return c.c==="above"?r>c.v:r<c.v}
  if(c.s==="chg"){if(i<c.n)return false;var ch=(p[i]/p[i-c.n]-1)*100;return c.c==="above"?ch>c.v:ch<c.v}
  var rf=refVal(p,i,c.s,c.n);if(rf===null)return false;return c.c==="above"?p[i]>rf:p[i]<rf}
function posCond(p,b,s){var n=p.length,pos=new Array(n).fill(0),on=0,ctx={};for(var i=0;i<n-1;i++){if(on===0){if(evalCond(b,p,i,ctx))on=1}else{if(evalCond(s,p,i,ctx))on=0}pos[i]=on}return pos}
function posAddon(p,ma,add){var n=p.length,pos=new Array(n).fill(0),on=0,entry=0,sm=smaArr(p,ma);
  for(var i=0;i<n-1;i++){var m=sm[i];if(m==null){pos[i]=0;continue}
    if(on===0){if(p[i]>m){on=0.5;entry=p[i]}}else{if(p[i]<m*(1-add))on=0;else if(on===0.5&&p[i]<=entry*(1-add))on=1}pos[i]=on}return pos}
function posDip(p,drop,hold){var n=p.length,pos=new Array(n).fill(0),i=30;while(i<n-1){var mx=0;for(var j=i-30;j<i;j++)if(p[j]>mx)mx=p[j];if(p[i]<=mx*(1-drop)){for(var k=i;k<Math.min(i+hold,n-1);k++)pos[k]=1;i+=hold+1}else i++}return pos}
function posCross(p,a,b){var x=smaArr(p,a),y=smaArr(p,b),n=p.length,pos=new Array(n).fill(0);for(var i=0;i<n-1;i++)if(x[i]!==null&&y[i]!==null&&x[i]>y[i])pos[i]=1;return pos}
function posMeanRev(p,dv,N0){var n=p.length,pos=new Array(n).fill(0),on=0,a=smaArr(p,N0||30);for(var i=0;i<n-1;i++){if(a[i]!==null){if(on===0&&p[i]<a[i]*(1-dv/100))on=1;else if(on===1&&p[i]>a[i])on=0}pos[i]=on}return pos}
function posCalm(p,vol){var v=volArr(p,20),n=p.length,pos=new Array(n).fill(0);for(var i=0;i<n-1;i++)if(v[i]!==null&&v[i]*100<vol)pos[i]=1;return pos}
function posSeason(d){var n=d.length,pos=new Array(n).fill(0);for(var i=0;i<n-1;i++){var m=+d[i].slice(5,7);if(m>=11||m<=4)pos[i]=1}return pos}
function posTurn(d){var n=d.length,pos=new Array(n).fill(0);for(var i=0;i<n-1;i++){var dd=+d[i].slice(8,10);if(dd>=28||dd<=3)pos[i]=1}return pos}
function sim(p,pos,cost,from){var n=p.length,eq=[1],e=1,prev=0,entry=-1,e0=1,trades=[];
  for(var i=from;i<n-1;i++){
    if(pos[i]!==prev){if(prev===0)e0=e;e*=(1-cost);if(pos[i]>0&&prev===0)entry=i;else if(pos[i]===0)trades.push({a:entry,b:i,r:e/e0-1});prev=pos[i]}
    if(pos[i]>0)e*=1+pos[i]*(p[i+1]/p[i]-1);
    eq.push(e)}
  return {eq:eq,trades:trades,open:prev>0?entry:-1}}
function randPos(n,from,pOn,pOff,rnd){var pos=new Array(n).fill(0),on=0;for(var i=from;i<n-1;i++){if(on===0){if(rnd()<pOn)on=1}else{if(rnd()<pOff)on=0}pos[i]=on}return pos}
function luckBand(p,pos,cost,from,runs){
  var n=p.length,entries=0,inD=0,outD=0,prev=0;
  for(var i=from;i<n-1;i++){if(pos[i]>0){inD++;if(prev===0)entries++}else outD++;prev=pos[i]}
  var pOn=entries/Math.max(1,outD),pOff=entries/Math.max(1,inD);
  var rnd=mulberry(12345),all=[];
  for(var k=0;k<runs;k++)all.push(sim(p,randPos(n,from,pOn,pOff,rnd),cost,from).eq);
  var len=all[0].length,lo=[],hi=[];
  for(var d=0;d<len;d++){var col=[];for(var k2=0;k2<runs;k2++)col.push(all[k2][d]);col.sort(function(a,b){return a-b});
    lo.push(col[Math.floor(runs*0.01)]);hi.push(col[Math.floor(runs*0.99)])}
  return {lo:lo,hi:hi}}
var MINT=30;
function score(M,H,lo,hi,nTrades,cash){
  if(nTrades<MINT)return "early";
  var floor=Math.max(hi,H,cash==null?-1e9:cash);
  if(M>floor)return "work";
  if(M<lo)return "no";
  return "luck"}
/* cash line: rows of {d,r}. daily=true means r is a daily percent (CDI). Otherwise r is an annual percent (US 3-month rate). Returns cumulative cash return per day from index "from". */
function cashCum(cs,dates,from,daily){
  var out=[0],acc=1,j=0;
  while(j<cs.d.length&&cs.d[j]<=dates[from])j++;
  var rate=j>0?cs.r[j-1]:cs.r[0];
  for(var i=from+1;i<dates.length;i++){
    var gap=(Date.parse(dates[i])-Date.parse(dates[i-1]))/864e5;
    if(daily){while(j<cs.d.length&&cs.d[j]<=dates[i]){acc*=1+cs.r[j]/100;j++}}
    else{while(j<cs.d.length&&cs.d[j]<=dates[i]){rate=cs.r[j];j++}acc*=1+rate/100*gap/360}
    out.push(acc-1)}
  return out}
function monthsBack(dates,m){var last=dates[dates.length-1],d=new Date(last+"T00:00:00Z");d.setUTCMonth(d.getUTCMonth()-m);var t=d.toISOString().slice(0,10);for(var i=0;i<dates.length;i++)if(dates[i]>=t)return i;return 0}
/* the shelf: 11 known rules. par = the choices a person can make. */
var N1=function(v){return v+" days"},PC=function(v){return v+"%"};
var SHELF=[
 {k:"trend",n:"Follow the trend",d:"Hold while the price is above its recent average.",def:{ma:50},par:[{key:"ma",lab:"Average",vals:[20,50,100,200],f:N1}],
  why:"Rising prices tend to keep rising for a while. Price above the average means rising, so the rule holds. Price below means falling, so it sits in cash. A short average trades often. A long one trades rarely."},
 {k:"golden",n:"Golden cross",d:"Hold when the 50-day average is above the 200-day average.",def:{},par:[],
  why:"When the average of the last 50 days climbs above the average of the last 200, many traders read it as a new uptrend. The rule holds while that is true. It trades rarely and reacts slowly."},
 {k:"fast",n:"Fast cross",d:"Hold when the 20-day average is above the 50-day average.",def:{},par:[],
  why:"The quicker cousin of the golden cross. It reacts sooner and trades more, which means more costs and more false alarms."},
 {k:"breakout",n:"Breakout",d:"Buy a new high. Sell a new low.",def:{bk:55,bx:20},par:[{key:"bk",lab:"Buy high",vals:[20,55,100],f:N1},{key:"bx",lab:"Sell low",vals:[10,20,50],f:N1}],
  why:"A price that pushes past its recent high may keep going. The rule buys that break and sells when the price drops below a recent low. Known from the Turtle traders of the 1980s."},
 {k:"momentum",n:"Momentum",d:"Hold while the price is up over the last few months.",def:{mn:90},par:[{key:"mn",lab:"Look back",vals:[30,90,180],f:N1}],
  why:"Things that went up lately often keep going up for a while. The rule holds while the price is higher than it was N days ago, and sits in cash when it is lower."},
 {k:"dip",n:"Buy the dip",d:"Buy after a sharp drop. Sell a few days later.",def:{drop:10,hold:10},par:[{key:"drop",lab:"Drop",vals:[5,10,15],f:PC},{key:"hold",lab:"Hold",vals:[5,10,20],f:N1}],
  why:"After a sharp drop, prices often bounce. The rule buys the drop, then sells after a fixed number of days, win or lose. A bigger drop means fewer, rarer trades."},
 {k:"rsi",n:"Oversold bounce",d:"Buy when a strength gauge (RSI) reads low. Sell when it recovers.",def:{lo:30},par:[{key:"lo",lab:"Buy under",vals:[25,30,35],f:function(v){return "RSI "+v}}],
  why:"RSI is a gauge from 0 to 100 of how hard a price has fallen or risen lately. A low reading looks worn out, so the rule buys. At 50 it sells. It trades often in choppy markets."},
 {k:"meanrev",n:"Snap back",d:"Buy when the price sits far under its 30-day average. Sell at the average.",def:{dv:10},par:[{key:"dv",lab:"Below avg",vals:[5,10,15],f:PC}],
  why:"A price that stretches far under its recent average often drifts back. The rule buys the stretch and sells when the price is back at the average. In a long slide it keeps buying too early."},
 {k:"calm",n:"Only when calm",d:"Hold only while daily moves are small. Sit out the wild stretches.",def:{vol:2},par:[{key:"vol",lab:"Daily swing under",vals:[1,2,3],f:PC}],
  why:"Wild stretches often come with big losses. The rule measures how much the price moved per day over the last 20 days and holds only when that stays under your limit."},
 {k:"season",n:"Sell in May",d:"Hold November through April. Sit in cash the rest of the year.",def:{},par:[],
  why:"A famous calendar saying: stocks do better from November to April. The rule holds only in those months. It trades about twice a year, so proof is slow."},
 {k:"turnmonth",n:"Turn of the month",d:"Hold from the 28th through the 3rd. Cash the rest.",def:{},par:[],
  why:"Paychecks and fund deposits land around month end. Some studies found prices rise a bit then. The rule holds only those days, so it trades about once a month and costs add up."},
 {k:"custom",n:"Build your own",d:"Pick a buy signal and a sell signal. Five signals to choose from.",own:true,def:{b:{s:"avg",c:"above",n:50,v:30},s:{s:"avg",c:"below",n:50,v:70}},par:[],
  why:"Pick when to buy and when to sell. Anything you build gets the same lock and the same score as the shelf."}];
var SIG={avg:"average",high:"highest close",low:"lowest close",rsi:"strength gauge (RSI)",chg:"change"};
function condText(c){
  if(c.s==="rsi")return "the 14-day strength gauge (RSI) is "+c.c+" "+c.v;
  if(c.s==="chg")return "its change over the last "+c.n+" days is "+c.c+" "+c.v+"%";
  return "it closes "+c.c+" its "+(c.s==="avg"?c.n+"-day average":(c.s==="high"?"highest close":"lowest close")+" of the last "+c.n+" days")}
function shelfOf(k){for(var i=0;i<SHELF.length;i++)if(SHELF[i].k===k)return SHELF[i];return SHELF[0]}
function ruleText(m){var c=m.p,nm=m.name||m.sym,k=m.kind,tail=" Cost "+(m.cost*100).toFixed(2)+"% each way.";
  if(k==="cross")return "Buy "+nm+" when its "+c.a+"-day average moves above its "+c.b+"-day average. Sell when it falls back below."+tail;
  if(k==="ema")return "Buy "+nm+" when its "+c.a+"-day weighted average (it counts recent days more) moves above its "+c.b+"-day weighted average. Sell when it falls back below."+tail;
  if(k==="macd")return "Buy "+nm+" when its MACD line (the "+c.f+"-day weighted average minus the "+c.s+"-day one) rises above its own "+c.g+"-day average. Sell when it falls back below."+tail;
  if(k==="bbr")return "Buy "+nm+" when it closes more than "+c.k+" standard deviations (a measure of normal swing) below its "+c.n+"-day average. Sell when it closes back above the average."+tail;
  if(k==="bbk")return "Buy "+nm+" when it closes more than "+c.k+" standard deviations (a measure of normal swing) above its "+c.n+"-day average. Sell when it closes back below the average."+tail;
  if(k==="near")return "Hold "+nm+" while it closes within "+c.pc+"% of its highest close of the last "+c.n+" days. Sit in cash otherwise."+tail;
  if(k==="tmom")return "Hold "+nm+" while it closes above its "+c.a+"-day average and higher than it was "+c.b+" days ago. Sit in cash otherwise."+tail;
  if(k==="trend")return "Buy "+nm+" when it closes above its "+c.ma+"-day average. Sell when it closes below."+tail;
  if(k==="addon")return "Buy a first hand of "+nm+" (half the money) when it closes above its "+c.ma+"-day average. If it then closes "+c.add+"% or more below that buy price, buy a second equal hand (the rest of the money). The stop is distant: sell everything only when it closes "+c.add+"% below the average."+tail;
  if(k==="golden")return "Buy "+nm+" when its 50-day average moves above its 200-day average. Sell when it falls back below."+tail;
  if(k==="fast")return "Buy "+nm+" when its 20-day average moves above its 50-day average. Sell when it falls back below."+tail;
  if(k==="breakout")return "Buy "+nm+" when it closes above its highest close of the last "+c.bk+" days. Sell when it closes below its lowest close of the last "+c.bx+" days."+tail;
  if(k==="momentum")return "Buy "+nm+" when it closes higher than it did "+c.mn+" days ago. Sell when it closes lower."+tail;
  if(k==="dip")return "Buy "+nm+" when it closes "+c.drop+"% or more below its 30-day high. Sell "+c.hold+" days later."+tail;
  if(k==="rsi")return "Buy "+nm+" when its 14-day strength gauge (RSI) drops below "+c.lo+". Sell when the gauge rises above "+(c.rx||50)+"."+tail;
  if(k==="meanrev")return "Buy "+nm+" when it closes "+c.dv+"% or more below its "+(c.n||30)+"-day average. Sell when it closes back above the average."+tail;
  if(k==="calm")return "Hold "+nm+" while its daily moves over the last 20 days average under "+c.vol+"%. Sit in cash otherwise."+tail;
  if(k==="season")return "Hold "+nm+" from November through April. Sit in cash from May through October."+tail;
  if(k==="turnmonth")return "Hold "+nm+" from the 28th of each month through the 3rd. Sit in cash the rest of the month."+tail;
  if(k==="hma")return "Hold "+nm+" while its "+c.n+"-day Hull average (a fast, smooth average) is rising. Sit in cash when it turns down."+tail;
  if(k==="sup")return "Hold "+nm+" while the trend is up. The trend flips down when the price closes below a floor set "+c.m+" times the "+c.n+"-day average daily move under the price, and back up when it closes above a ceiling set the same way. Uses daily closes only."+tail;
  if(k==="ichi")return "Hold "+nm+" while its price closes above the cloud (the band set by the "+c.t+", "+c.k+" and "+c.s+"-day middle prices, drawn "+c.k+" days ahead). Sit in cash otherwise. Uses daily closes only."+tail;
  if(k==="ichx")return "Hold "+nm+" while the "+c.t+"-day middle price is above the "+c.k+"-day middle price and the price is above the "+c.k+"-day one. Sit in cash otherwise. Uses daily closes only."+tail;
  if(k==="sto")return "Buy "+nm+" when its price sits in the bottom "+c.lo+"% of the last "+c.n+" days' range. Sell when it climbs into the top "+(100-c.hi)+"%."+tail;
  if(k==="cct")return "Buy "+nm+" when its "+c.n+"-day channel index (how far the price is from its average, in typical swings) rises above "+c.a+". Sell when it falls below "+c.b+"."+tail;
  if(k==="ccr")return "Buy "+nm+" when its "+c.n+"-day channel index (how far the price is from its average, in typical swings) falls below "+c.a+". Sell when it recovers above "+c.b+"."+tail;
  if(k==="kel")return "Buy "+nm+" when it closes more than "+c.m+" times the "+c.n+"-day average daily move above its "+c.n+"-day weighted average. Sell when it closes back below that average."+tail;
  if(k==="aro")return "Buy "+nm+" when its highest close in the last "+c.n+" days is recent (at least 70% fresh) and fresher than its lowest. Sell when the lowest close becomes fresher."+tail;
  if(k==="trx")return "Hold "+nm+" while its "+c.n+"-day triple-smoothed average is rising. Sit in cash when it turns down."+tail;
  if(k==="rs2")return "Buy "+nm+" when its 2-day RSI drops under "+c.lo+" while the price is above its "+c.t+"-day average. Sell when the 2-day RSI rises above 70."+tail;
  if(k==="dem")return "Hold "+nm+" while its price is above its "+c.n+"-day double weighted average (a fast average). Sit in cash below it."+tail;
  if(k==="tem")return "Hold "+nm+" while its price is above its "+c.n+"-day triple weighted average (a faster average). Sit in cash below it."+tail;
  if(k==="kam")return "Hold "+nm+" while its price is above its "+c.n+"-day adaptive average (it speeds up in strong trends and slows in choppy ones). Sit in cash below it."+tail;
  if(k==="slp")return "Hold "+nm+" while the straight line fitted to its last "+c.n+" closes slopes up. Sit in cash when it slopes down."+tail;
  if(k==="trl")return "Buy "+nm+" when it closes at a new "+c.n+"-day high. Sell when it closes more than "+c.m+" times the "+c.n+"-day average daily move below its highest close since the buy."+tail;
  if(k==="rib")return "Hold "+nm+" while its "+c.a+"-day average is above its "+c.b+"-day average, which is above its "+c.c+"-day average. Sit in cash otherwise."+tail;
  if(k==="rst")return "Buy "+nm+" when its "+c.n+"-day RSI rises above "+c.hi+". Sell when it falls below "+c.lo+"."+tail;
  if(k==="mtfh")return "Full strategy on 1-hour closes: buy "+nm+" when the daily, 4-hour and 1-hour trends agree (20 over 50 over 200), RSI over 50, ADX over 20, volume 1.2x normal and the candle shows buying, on a close above the 20 or a swept low; 2.5 ATR stop, 3 ATR trail, out on a 1-hour or 4-hour close under the 50. 0.5% risk per trade."+tail;
  if(k==="mtf")return "Buy "+nm+" when its "+c.a+"-day weighted average is above its "+c.b+"-day, the "+c.b+"-day is above its "+c.c+"-day, the price closes above the "+c.a+"-day, and the 14-day RSI is above "+c.r+". Sell when it closes below the "+c.b+"-day average or the "+c.b+"-day falls under the "+c.c+"-day. Daily closes only: the 1-hour, volume and ATR parts of the original script are not in this test."+tail;
  return "Buy "+nm+" when "+condText(c.b)+". Sell when "+condText(c.s)+"."+tail}
function positions(m,p,d){var c=m.p,k=m.kind;
  if(k==="cross")return posAvgX(p,smaArr(p,c.a),smaArr(p,c.b));if(k==="ema")return posAvgX(p,emaArr(p,c.a),emaArr(p,c.b));if(k==="macd")return posMacd(p,c.f,c.s,c.g);if(k==="bbr")return posBand(p,c.n,c.k,false);if(k==="bbk")return posBand(p,c.n,c.k,true);if(k==="near")return posNear(p,c.n,c.pc);if(k==="tmom")return posTM(p,c.a,c.b);
  
  if(k==="trend")return posCond(p,{s:"avg",c:"above",n:c.ma},{s:"avg",c:"below",n:c.ma});
  if(k==="addon")return posAddon(p,c.ma,c.add/100);
  if(k==="golden")return posCross(p,50,200);
  if(k==="fast")return posCross(p,20,50);
  if(k==="breakout")return posCond(p,{s:"high",c:"above",n:c.bk},{s:"low",c:"below",n:c.bx});
  if(k==="momentum")return posCond(p,{s:"chg",c:"above",n:c.mn,v:0},{s:"chg",c:"below",n:c.mn,v:0});
  if(k==="dip")return posDip(p,c.drop/100,c.hold);
  if(k==="rsi")return posCond(p,{s:"rsi",c:"below",v:c.lo},{s:"rsi",c:"above",v:c.rx||50});
  if(k==="meanrev")return posMeanRev(p,c.dv,c.n);
  if(k==="calm")return posCalm(p,c.vol);
  if(k==="season")return posSeason(d);
  if(k==="turnmonth")return posTurn(d);
  if(k==="hma")return posHma(p,c.n);if(k==="sup")return posSuper(p,c.n,c.m);if(k==="ichi")return posIchi(p,c.t,c.k,c.s,"cloud");if(k==="ichx")return posIchi(p,c.t,c.k,c.s||52,"lines");
  if(k==="sto")return posStoch(p,c.n,c.lo,c.hi);if(k==="cct")return posCci(p,c.n,c.a,c.b,false);if(k==="ccr")return posCci(p,c.n,c.a,c.b,true);if(k==="kel")return posKelt(p,c.n,c.m);if(k==="aro")return posAroon(p,c.n);
  if(k==="trx")return posTrix(p,c.n);if(k==="rs2")return posRsi2(p,c.lo,c.t);if(k==="dem")return posMaP(p,dema(p,c.n));if(k==="tem")return posMaP(p,tema(p,c.n));if(k==="kam")return posMaP(p,kamaArr(p,c.n));
  if(k==="slp")return posSlope(p,c.n);if(k==="trl")return posTrail(p,c.n,c.m);if(k==="rib")return posRibbon(p,c.a,c.b,c.c);if(k==="rst")return posRsiT(p,c.n,c.hi,c.lo);if(k==="mtf")return posMtf(p,c.a,c.b,c.c,c.r);
  return posCond(p,c.b,c.s)}
var FAMINFO=[
 {n:"Weighted cross",d:"Hold when a fast weighted average is above a slow one.",why:"Like the average cross, but recent days count more, so it reacts sooner. It trades a little more and gets fooled a little more."},
 {n:"MACD",d:"Hold when momentum is building.",why:"MACD is the gap between a fast and a slow weighted average. When that gap rises above its own recent average, momentum is building, so the rule holds. When it falls back, it sits in cash."},
 {n:"Bands bounce",d:"Buy far below the average. Sell back at the average.",why:"Bands mark how far a price normally swings around its average. A close well outside the band often snaps back. The rule buys that stretch and sells when the price returns to the average."},
 {n:"Bands breakout",d:"Buy far above the average. Sell back at the average.",why:"The other reading of the same bands: a close far above its normal swing can mean a strong move is starting. The rule buys it and sells when the price falls back to the average."},
 {n:"Near the high",d:"Hold while the price sits close to its recent high.",why:"Prices near a high often mean strength. The rule holds while the price stays within a set distance of its highest close, and sits in cash when it slips further away."},
 {n:"Trend plus momentum",d:"Hold when the price is above its average and rising.",why:"Two checks at once: above the average, and higher than it was some days ago. Both must agree, so it trades less and skips weak rallies."}];
var ENG_NEW_MARK=1;
function emaArr(p,N){var n=p.length,o=new Array(n).fill(null),k=2/(N+1),e=p[0];for(var i=0;i<n;i++){e=i===0?p[0]:p[i]*k+e*(1-k);if(i>=N-1)o[i]=e}return o}
function emaOf(a,N,st){var n=a.length,o=new Array(n).fill(null),k=2/(N+1),e=null;for(var i=st;i<n;i++){e=e===null?a[i]:a[i]*k+e*(1-k);o[i]=e}return o}
function posAvgX(p,x,y){var n=p.length,pos=new Array(n).fill(0);for(var i=0;i<n-1;i++)if(x[i]!==null&&y[i]!==null&&x[i]>y[i])pos[i]=1;return pos}
function posMacd(p,f,s,g){var a=emaArr(p,f),b=emaArr(p,s),n=p.length,m=new Array(n).fill(null);for(var i=s-1;i<n;i++)m[i]=a[i]-b[i];return posAvgX(p,m,emaOf(m,g,s-1))}
function posBand(p,N,K,brk){var n=p.length,pos=new Array(n).fill(0),on=0,a=smaArr(p,N);for(var i=N-1;i<n-1;i++){var s=0,mu=a[i];for(var j=i-N+1;j<=i;j++){var q=p[j]-mu;s+=q*q}var sd=Math.sqrt(s/N);
  if(brk){if(on===0&&p[i]>mu+K*sd)on=1;else if(on===1&&p[i]<mu)on=0}else{if(on===0&&p[i]<mu-K*sd)on=1;else if(on===1&&p[i]>mu)on=0}pos[i]=on}return pos}
function posNear(p,N,pc){var n=p.length,pos=new Array(n).fill(0);for(var i=N-1;i<n-1;i++){var hi=0;for(var j=i-N+1;j<=i;j++)if(p[j]>hi)hi=p[j];if(p[i]>=hi*(1-pc/100))pos[i]=1}return pos}
function posTM(p,a,b){var n=p.length,pos=new Array(n).fill(0),s=smaArr(p,a);for(var i=0;i<n-1;i++)if(s[i]!==null&&i>=b&&p[i]>s[i]&&p[i]>p[i-b])pos[i]=1;return pos}
function luckEnd(p,pos,cost,from,runs,fast){if(!fast)runs=Math.max(runs,500);var n=p.length,entries=0,inD=0,outD=0,prev=0;for(var i=from;i<n-1;i++){if(pos[i]===1){inD++;if(prev===0)entries++}else outD++;prev=pos[i]}var pOn=entries/Math.max(1,outD),pOff=entries/Math.max(1,inD),rnd=mulberry(12345),e=[];for(var k=0;k<runs;k++){var q=sim(p,randPos(n,from,pOn,pOff,rnd),cost,from).eq;e.push(q[q.length-1])}e.sort(function(a,b){return a-b});return {lo:e[Math.floor(runs*0.01)],hi:e[Math.floor(runs*0.99)]}}
function maxDD(eq){var pk=eq[0],dd=0;for(var i=0;i<eq.length;i++){if(eq[i]>pk)pk=eq[i];var d=eq[i]/pk-1;if(d<dd)dd=d}return dd}
function pf(tr){var w=0,l=0;tr.forEach(function(t){if(t.r>0)w+=t.r;else l-=t.r});return l>0?w/l:null}

/* ---- pool, third batch: popular chart-tool rules, written here from their public descriptions, on daily closes only ---- */
function emaFull(a,N){var n=a.length,o=new Array(n),k=2/(N+1),e=a[0];for(var i=0;i<n;i++){e=i===0?a[0]:a[i]*k+e*(1-k);o[i]=e}return o}
function wmaArr(a,N){var n=a.length,o=new Array(n).fill(null);for(var i=N-1;i<n;i++){var s=0,w=0,ok=true;for(var j=0;j<N;j++){var v=a[i-N+1+j];if(v===null){ok=false;break}s+=v*(j+1);w+=j+1}if(ok)o[i]=s/w}return o}
function hmaArr(p,N){var h=Math.max(1,Math.round(N/2)),q=Math.max(1,Math.round(Math.sqrt(N))),a=wmaArr(p,h),b=wmaArr(p,N),d=p.map(function(_,i){return a[i]===null||b[i]===null?null:2*a[i]-b[i]});return wmaArr(d,q)}
function atrArr(p,N){var n=p.length,o=new Array(n).fill(null),s=0;for(var i=1;i<n;i++){s+=Math.abs(p[i]-p[i-1]);if(i>N)s-=Math.abs(p[i-N]-p[i-N-1]);if(i>=N)o[i]=s/N}return o}
function hhll(p,i,N){var hi=-1e18,lo=1e18;for(var j=i-N+1;j<=i;j++){if(p[j]>hi)hi=p[j];if(p[j]<lo)lo=p[j]}return [hi,lo]}
function z(n){return new Array(n).fill(0)}
function posHma(p,N){var h=hmaArr(p,N),n=p.length,pos=z(n);for(var i=1;i<n-1;i++)if(h[i]!==null&&h[i-1]!==null&&h[i]>h[i-1])pos[i]=1;return pos}
function posSuper(p,N,mu){var a=atrArr(p,N),n=p.length,pos=z(n),up=null,dn=null,tr=0;for(var i=N;i<n-1;i++){var ub=p[i]+mu*a[i],lb=p[i]-mu*a[i];if(up===null){up=ub;dn=lb;tr=p[i]>p[i-1]?1:0}else{var pu=up,pd=dn;up=(ub<pu||p[i-1]>pu)?ub:pu;dn=(lb>pd||p[i-1]<pd)?lb:pd;if(tr===1&&p[i]<pd)tr=0;else if(tr===0&&p[i]>pu)tr=1}pos[i]=tr}return pos}
function posIchi(p,t,k,s,mode){var n=p.length,pos=z(n);function mid(i,N){var q=hhll(p,i,N);return (q[0]+q[1])/2}for(var i=s+k;i<n-1;i++){var j=i-k,sa=(mid(j,t)+mid(j,k))/2,sb=mid(j,s);if(mode==="cloud")pos[i]=p[i]>Math.max(sa,sb)?1:0;else{var tk=mid(i,t),kj=mid(i,k);pos[i]=(tk>kj&&p[i]>kj)?1:0}}return pos}
function posStoch(p,N,lo,hi){var n=p.length,pos=z(n),on=0;for(var i=N-1;i<n-1;i++){var q=hhll(p,i,N),kk=q[0]===q[1]?50:(p[i]-q[1])/(q[0]-q[1])*100;if(on===0&&kk<lo)on=1;else if(on===1&&kk>hi)on=0;pos[i]=on}return pos}
function cciAt(p,i,N){var s=0,j;for(j=i-N+1;j<=i;j++)s+=p[j];var m=s/N,d=0;for(j=i-N+1;j<=i;j++)d+=Math.abs(p[j]-m);d/=N;return d===0?0:(p[i]-m)/(0.015*d)}
function posCci(p,N,a,b,rev){var n=p.length,pos=z(n),on=0;for(var i=N-1;i<n-1;i++){var c=cciAt(p,i,N);if(rev){if(on===0&&c<a)on=1;else if(on===1&&c>b)on=0}else{if(on===0&&c>a)on=1;else if(on===1&&c<b)on=0}pos[i]=on}return pos}
function posKelt(p,N,mu){var em=emaFull(p,N),a=atrArr(p,N),n=p.length,pos=z(n),on=0;for(var i=N;i<n-1;i++){if(on===0&&p[i]>em[i]+mu*a[i])on=1;else if(on===1&&p[i]<em[i])on=0;pos[i]=on}return pos}
function posAroon(p,N){var n=p.length,pos=z(n),on=0;for(var i=N;i<n-1;i++){var hi=-1e18,lo=1e18,hd=0,ld=0;for(var j=i-N;j<=i;j++){if(p[j]>=hi){hi=p[j];hd=i-j}if(p[j]<=lo){lo=p[j];ld=i-j}}var u=100*(N-hd)/N,d=100*(N-ld)/N;if(on===0&&u>=70&&u>d)on=1;else if(on===1&&d>u)on=0;pos[i]=on}return pos}
function posTrix(p,N){var t=emaFull(emaFull(emaFull(p,N),N),N),n=p.length,pos=z(n);for(var i=3*N;i<n-1;i++)if(t[i]>t[i-1])pos[i]=1;return pos}
function posRsi2(p,lo,tn){var r=rsiArr(p,2),s=smaArr(p,tn),n=p.length,pos=z(n),on=0;for(var i=tn;i<n-1;i++){if(r[i]===null||s[i]===null){pos[i]=on;continue}if(on===0&&r[i]<lo&&p[i]>s[i])on=1;else if(on===1&&r[i]>70)on=0;pos[i]=on}return pos}
function posMaP(p,a){var n=p.length,pos=z(n);for(var i=0;i<n-1;i++)if(a[i]!==null&&a[i]!==undefined&&p[i]>a[i])pos[i]=1;return pos}
function dema(p,N){var a=emaFull(p,N),b=emaFull(a,N);return p.map(function(_,i){return i<2*N?null:2*a[i]-b[i]})}
function tema(p,N){var a=emaFull(p,N),b=emaFull(a,N),c=emaFull(b,N);return p.map(function(_,i){return i<3*N?null:3*a[i]-3*b[i]+c[i]})}
function kamaArr(p,N){var n=p.length,o=new Array(n).fill(null),k=null,f=2/3,sl=2/31;for(var i=N;i<n;i++){var ch=Math.abs(p[i]-p[i-N]),v=0;for(var j=i-N+1;j<=i;j++)v+=Math.abs(p[j]-p[j-1]);var er=v===0?0:ch/v,sc=Math.pow(er*(f-sl)+sl,2);k=k===null?p[i]:k+sc*(p[i]-k);o[i]=k}return o}
function posSlope(p,N){var n=p.length,pos=z(n),sx=0,sxx=0,j;for(j=0;j<N;j++){sx+=j;sxx+=j*j}var den=N*sxx-sx*sx;for(var i=N-1;i<n-1;i++){var sy=0,sxy=0;for(j=0;j<N;j++){var y=p[i-N+1+j];sy+=y;sxy+=j*y}if((N*sxy-sx*sy)/den>0)pos[i]=1}return pos}
function posTrail(p,N,mu){var a=atrArr(p,N),n=p.length,pos=z(n),on=0,pk=0;for(var i=N;i<n-1;i++){if(on===0){var q=hhll(p,i-1,N);if(p[i]>q[0]){on=1;pk=p[i]}}else{if(p[i]>pk)pk=p[i];if(p[i]<pk-mu*a[i])on=0}pos[i]=on}return pos}
function posRibbon(p,a,b,c){var x=smaArr(p,a),y=smaArr(p,b),w=smaArr(p,c),n=p.length,pos=z(n);for(var i=0;i<n-1;i++)if(x[i]!==null&&y[i]!==null&&w[i]!==null&&x[i]>y[i]&&y[i]>w[i])pos[i]=1;return pos}
function posMtf(p,a,b,c,r){var x=emaArr(p,a),y=emaArr(p,b),w=emaArr(p,c),rs=rsiArr(p,14),n=p.length,pos=z(n),on=0;for(var i=0;i<n-1;i++){if(x[i]===null||y[i]===null||w[i]===null||rs[i]===null)continue;if(on===0&&x[i]>y[i]&&y[i]>w[i]&&p[i]>x[i]&&rs[i]>r)on=1;else if(on===1&&(p[i]<y[i]||y[i]<w[i]))on=0;pos[i]=on}return pos}
function posRsiT(p,N,hi,lo){var r=rsiArr(p,N),n=p.length,pos=z(n),on=0;for(var i=0;i<n-1;i++){if(r[i]===null)continue;if(on===0&&r[i]>hi)on=1;else if(on===1&&r[i]<lo)on=0;pos[i]=on}return pos}
var FAM={trend:"Follow the trend",cross:"Average cross",ema:"Weighted average cross",macd:"MACD",breakout:"Breakout",momentum:"Momentum",dip:"Buy the dip",rsi:"Oversold bounce",meanrev:"Snap back",calm:"Only when calm",season:"Calendar",turnmonth:"Calendar",bbr:"Bands bounce",bbk:"Bands breakout",near:"Near the high",tmom:"Trend plus momentum"};
FAM.hma="Hull average";FAM.sup="Trend flip";FAM.ichi="Cloud";FAM.ichx="Cloud";FAM.sto="Range position";FAM.cct="Channel index";FAM.ccr="Channel index";FAM.kel="Channel breakout";FAM.aro="Trend age";FAM.trx="Triple smooth";FAM.rs2="Short-term RSI";FAM.dem="Fast average";FAM.tem="Fast average";FAM.kam="Adaptive average";FAM.slp="Straight-line slope";FAM.trl="Trailing stop";FAM.rib="Average ribbon";FAM.rst="RSI trend";FAM.mtf="Multi-timeframe, daily";FAM.mtfh="Full strategy test";FAM.addon="Add on a dip";
function nameOf(k,c){
 if(k==="hma")return "Hull average rising, "+c.n+"-day";
 if(k==="sup")return "Trend flip (ATR bands), "+c.n+"-day, "+c.m+"x";
 if(k==="ichi")return "Cloud, price above, "+c.t+"/"+c.k+"/"+c.s;
 if(k==="ichx")return "Cloud lines, "+c.t+" over "+c.k;
 if(k==="sto")return "Range position, buy under "+c.lo+", sell over "+c.hi+", "+c.n+"-day";
 if(k==="cct")return "Channel index trend, "+c.n+"-day, in "+c.a+", out "+c.b;
 if(k==="ccr")return "Channel index bounce, "+c.n+"-day, in "+c.a+", out "+c.b;
 if(k==="kel")return "Channel breakout, "+c.n+"-day, "+c.m+"x";
 if(k==="aro")return "Trend age, "+c.n+"-day";
 if(k==="trx")return "Triple smooth rising, "+c.n+"-day";
 if(k==="rs2")return "Short-term RSI under "+c.lo+", trend "+c.t+"-day";
 if(k==="dem")return "Fast average (double), "+c.n+"-day";
 if(k==="tem")return "Fast average (triple), "+c.n+"-day";
 if(k==="kam")return "Adaptive average, "+c.n+"-day";
 if(k==="slp")return "Straight-line slope up, "+c.n+"-day";
 if(k==="trl")return "Trailing stop, "+c.n+"-day high, "+c.m+"x";
 if(k==="rib")return "Average ribbon, "+c.a+"/"+c.b+"/"+c.c;
 if(k==="rst")return "RSI trend, "+c.n+"-day, in "+c.hi+", out "+c.lo;
 if(k==="mtfh")return "Full strategy test, from "+(c.from||"2020");
 if(k==="mtf")return "Multi-timeframe, daily, "+c.a+"/"+c.b+"/"+c.c+" with RSI over "+c.r;
 if(k==="trend")return "Follow the trend, "+c.ma+"-day";
 if(k==="addon")return "Add on a dip, "+c.ma+"-day trend, second hand "+c.add+"% down";
 if(k==="cross")return "Average cross, "+c.a+" over "+c.b;
 if(k==="ema")return "Weighted cross, "+c.a+" over "+c.b;
 if(k==="macd")return "MACD "+c.f+"/"+c.s+"/"+c.g;
 if(k==="breakout")return "Breakout, buy "+c.bk+"-day high, sell "+c.bx+"-day low";
 if(k==="momentum")return "Momentum, "+c.mn+"-day";
 if(k==="dip")return "Buy the dip, "+c.drop+"% drop, hold "+c.hold+" days";
 if(k==="rsi")return "Oversold bounce, buy RSI "+c.lo+", sell "+(c.rx||50);
 if(k==="meanrev")return "Snap back, "+c.dv+"% under "+(c.n||30)+"-day average";
 if(k==="calm")return "Only when calm, swings under "+c.vol+"%";
 if(k==="season")return "Sell in May";
 if(k==="turnmonth")return "Turn of the month";
 if(k==="bbr")return "Bands bounce, "+c.n+"-day, "+c.k+" deviations";
 if(k==="bbk")return "Bands breakout, "+c.n+"-day, "+c.k+" deviations";
 if(k==="near")return "Near the high, within "+c.pc+"% of "+c.n+"-day high";
 if(k==="tmom")return "Trend plus momentum, "+c.a+"-day average and "+c.b+"-day gain";
 if(k==="golden")return "Golden cross";if(k==="fast")return "Fast cross";
 return shelfOf(k).n}
function stratName(m){return nameOf(m.kind,m.p||{})}
var CAT=[];(function(){function add(k,p){CAT.push({k:k,p:p,n:nameOf(k,p),fam:FAM[k]})}
 [10,15,20,30,50,75,100,150,200,250].forEach(function(v){add("trend",{ma:v})});
 [[5,20],[10,30],[10,50],[20,50],[20,100],[20,200],[30,100],[50,100],[50,150],[50,200],[100,200]].forEach(function(x){add("cross",{a:x[0],b:x[1]})});
 [[5,20],[12,26],[10,50],[20,50],[20,100],[50,200]].forEach(function(x){add("ema",{a:x[0],b:x[1]})});
 [[12,26,9],[8,17,9],[5,35,5]].forEach(function(x){add("macd",{f:x[0],s:x[1],g:x[2]})});
 [[20,10],[20,20],[50,25],[55,10],[55,20],[100,20],[100,50],[150,50],[200,100]].forEach(function(x){add("breakout",{bk:x[0],bx:x[1]})});
 [10,20,30,60,90,120,180,250].forEach(function(v){add("momentum",{mn:v})});
 [[5,5],[5,10],[7,10],[8,15],[10,10],[10,20],[15,10],[15,20],[20,20],[20,30]].forEach(function(x){add("dip",{drop:x[0],hold:x[1]})});
 [[20,50],[25,50],[30,50],[35,50],[40,50],[30,60],[30,70],[35,65]].forEach(function(x){add("rsi",{lo:x[0],rx:x[1]})});
 [[10,3],[10,5],[20,5],[20,8],[20,10],[30,5],[30,10],[30,15],[50,10],[50,15]].forEach(function(x){add("meanrev",{n:x[0],dv:x[1]})});
 [1,1.5,2,3,4,5].forEach(function(v){add("calm",{vol:v})});
 add("season",{});add("turnmonth",{});
 [[10,1.5],[20,1.5],[20,2],[50,2]].forEach(function(x){add("bbr",{n:x[0],k:x[1]})});
 [[10,2],[20,1],[20,2],[50,2]].forEach(function(x){add("bbk",{n:x[0],k:x[1]})});
 [[250,5],[250,10],[250,20],[100,5],[100,10]].forEach(function(x){add("near",{n:x[0],pc:x[1]})});
 [[50,30],[100,90],[200,90],[200,180]].forEach(function(x){add("tmom",{a:x[0],b:x[1]})});
 /* pool, second batch: more settings of the same known rules */
 [5,7,12,25,40,60,80,120,175,300].forEach(function(v){add("trend",{ma:v})});
 [[5,10],[5,30],[10,20],[15,45],[20,60],[25,75],[30,200],[40,120],[100,250]].forEach(function(x){add("cross",{a:x[0],b:x[1]})});
 [[8,21],[9,21],[10,30],[15,45],[20,200],[30,90]].forEach(function(x){add("ema",{a:x[0],b:x[1]})});
 [[6,19,9],[10,26,9],[12,26,5],[16,36,9],[20,50,10]].forEach(function(x){add("macd",{f:x[0],s:x[1],g:x[2]})});
 [[15,7],[30,15],[40,20],[60,30],[75,25],[120,60]].forEach(function(x){add("breakout",{bk:x[0],bx:x[1]})});
 [15,40,45,75,150,200].forEach(function(v){add("momentum",{mn:v})});
 [[3,3],[3,7],[4,5],[6,7],[8,5],[12,15],[12,25],[18,20],[25,30],[30,30]].forEach(function(x){add("dip",{drop:x[0],hold:x[1]})});
 [[15,45],[25,60],[25,70],[28,55],[30,45],[35,55],[40,60],[20,40]].forEach(function(x){add("rsi",{lo:x[0],rx:x[1]})});
 [[5,2],[5,4],[10,2],[15,4],[15,8],[20,3],[40,8],[40,12],[60,10],[60,15]].forEach(function(x){add("meanrev",{n:x[0],dv:x[1]})});
 [1.25,1.75,2.5,3.5].forEach(function(v){add("calm",{vol:v})});
 [[15,1],[15,2],[30,1.5],[30,2],[50,1.5],[100,2]].forEach(function(x){add("bbr",{n:x[0],k:x[1]})});
 [[15,1.5],[30,1],[30,2],[100,2],[10,1],[50,1.5]].forEach(function(x){add("bbk",{n:x[0],k:x[1]})});
 [[50,5],[50,10],[120,5],[120,10],[200,5],[200,10]].forEach(function(x){add("near",{n:x[0],pc:x[1]})});
 [[20,10],[50,60],[50,90],[100,30],[100,60],[150,90],[200,60],[250,120]].forEach(function(x){add("tmom",{a:x[0],b:x[1]})});
 /* pool, third batch: popular chart-tool rules */
 [9,16,21,34,55,100,150,200].forEach(function(v){add("hma",{n:v})});
 [[7,3],[10,3],[14,3],[10,2],[20,3],[10,4],[14,2],[20,2],[30,3],[50,3]].forEach(function(x){add("sup",{n:x[0],m:x[1]})});
 [[9,26,52],[7,22,44],[20,60,120],[10,30,60]].forEach(function(x){add("ichi",{t:x[0],k:x[1],s:x[2]})});
 [[9,26,52],[7,22,44],[20,60,120],[5,15,30]].forEach(function(x){add("ichx",{t:x[0],k:x[1],s:x[2]})});
 [[14,20,80],[14,10,70],[21,20,80],[9,20,80],[14,25,60],[5,20,70]].forEach(function(x){add("sto",{n:x[0],lo:x[1],hi:x[2]})});
 [[20,100,0],[14,100,0],[20,50,-50],[30,100,0],[50,100,0]].forEach(function(x){add("cct",{n:x[0],a:x[1],b:x[2]})});
 [[20,-100,0],[14,-100,0],[20,-150,-50],[30,-100,0],[10,-100,0]].forEach(function(x){add("ccr",{n:x[0],a:x[1],b:x[2]})});
 [[20,1.5],[20,2],[10,1.5],[50,2],[20,1],[50,1]].forEach(function(x){add("kel",{n:x[0],m:x[1]})});
 [14,25,50,100].forEach(function(v){add("aro",{n:v})});
 [9,12,15,18,30].forEach(function(v){add("trx",{n:v})});
 [[5,200],[10,200],[15,200],[10,100],[10,50],[5,100]].forEach(function(x){add("rs2",{lo:x[0],t:x[1]})});
 [10,20,50,100,200].forEach(function(v){add("dem",{n:v})});
 [10,20,50,100,200].forEach(function(v){add("tem",{n:v})});
 [10,20,30,60].forEach(function(v){add("kam",{n:v})});
 [20,50,100,200,250].forEach(function(v){add("slp",{n:v})});
 [[20,2],[20,3],[50,3],[50,4],[100,3],[100,4],[20,4]].forEach(function(x){add("trl",{n:x[0],m:x[1]})});
 [[10,20,50],[5,10,20],[20,50,200],[8,21,55]].forEach(function(x){add("rib",{a:x[0],b:x[1],c:x[2]})});
 [[14,55,45],[21,55,45],[30,55,45],[50,55,45],[14,60,40],[30,60,40]].forEach(function(x){add("rst",{n:x[0],hi:x[1],lo:x[2]})});
 [[40,10],[40,20],[100,10],[100,20],[200,10],[200,20]].forEach(function(x){add("addon",{ma:x[0],add:x[1]})});
})();
if(typeof document!=="undefined")document.addEventListener("DOMContentLoaded",function(){var n=CAT.length;[].forEach.call(document.querySelectorAll("[data-pool]"),function(e){e.textContent=n})});
root.E={FAMINFO:FAMINFO,luckEnd:luckEnd,CAT:CAT,stratName:stratName,maxDD:maxDD,pf:pf,SHELF:SHELF,SIG:SIG,shelfOf:shelfOf,ruleText:ruleText,condText:condText,positions:positions,sim:sim,luckBand:luckBand,score:score,cashCum:cashCum,monthsBack:monthsBack,MINT:MINT,mulberry:mulberry,rsiArr:rsiArr,smaArr:smaArr}
})(typeof window!=="undefined"?window:globalThis);
