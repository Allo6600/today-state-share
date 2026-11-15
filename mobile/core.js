/* 自動生成(build.py)。直接は編集しない。 */

/* ===== core: 日付・統計・読み取り・判定(DOMに依存しない) ===== */
const DAY=86400000;
const pad=n=>String(n).padStart(2,'0');
const fmtDate=d=>d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate());
const dateToUTC=s=>{const a=s.split('-').map(Number);return Date.UTC(a[0],a[1]-1,a[2])};
const addDays=(s,n)=>fmtDate(new Date(dateToUTC(s)+n*DAY));
const diffDays=(a,b)=>Math.round((dateToUTC(a)-dateToUTC(b))/DAY);
const median=a=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2};
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const pct=(a,p)=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y),i=(s.length-1)*p,lo=Math.floor(i),hi=Math.ceil(i);return s[lo]+(s[hi]-s[lo])*(i-lo)};
const FLOOR={sleep:30,rhr:1.5,temp:0.12,ex:10};

function groupStarts(dates){
  const s=[...dates].sort();const starts=[];let prev=null;
  for(const d of s){if(prev===null||diffDays(d,prev)>7)starts.push(d);prev=d}
  return starts;
}

/* ===== 根拠(文献) ===== */
const SRC={
  jang2025:{n:'Jang ほか 2025, PLOS ONE(メタ分析)',u:'https://pmc.ncbi.nlm.nih.gov/articles/PMC11913300/',x:'周期と認知のメタ分析(102論文・3,943人)。注意・創造性・実行機能・知能・記憶・運動・空間・言語のいずれも、頑健な差は見つからなかった。'},
  bull2019:{n:'Bull ほか 2019, npj Digital Medicine',u:'https://www.nature.com/articles/s41746-019-0152-7',x:'612,613周期の解析。卵胞期の平均16.9日(95%CI 10〜30)、黄体期の平均12.4日(7〜17)、28日周期は全体の約13%。排卵は14日目とは限らない。'},
  acogPMS:{n:'PMSの診断基準の解説(PMC4890701)',u:'https://pmc.ncbi.nlm.nih.gov/articles/PMC4890701/',x:'ACOGは、月経前5日間に症状があり、3周期連続し、月経開始から4日以内に消えることを要件とする。PMDDで症状が最も重いのは月経の3〜4日前〜開始後3日ごろ。'},
  pmsTiming:{n:'PMSの症状の時期・種類(fpnotebook)',u:'https://mobile.fpnotebook.com/Gyn/Psych/PrmnstrlSyndrm.htm',x:'症状の開始は月経の2〜12日前。身体症状(腹部膨満、乳房痛、頭痛、関節痛・筋肉痛、むくみ、体重増)と情動症状(不安、いらだち)。月経開始か1週間以内に軽快。'},
  pmddFree:{n:'PMDDの診断(ScienceDirect Topics)',u:'https://www.sciencedirect.com/topics/pharmacology-toxicology-and-pharmaceutical-science/premenstrual-syndrome',x:'PMDDの診断で、症状のない区間は月経4日目ごろから排卵まで。'},
  phaseProj:{n:'臨床試験プロトコル(NCT03862469)',u:'https://cdn.clinicaltrials.gov/large-docs/69/NCT03862469/Prot_SAP_000.pdf',x:'軽い症状は多くの人で月経の1〜2日前だけ。ACOGの基準は5日前から。'},
  glowm:{n:'月経痛(GLOWM)',u:'https://www.glowm.com/section-view/item/9',x:'月経の数時間前〜直後に始まり、1〜2日目が最も強い。月経のある人の50%超が経験し、10〜12%は1〜3日間日常が困難になるほど重い。症状が2〜3日を超えることは少ない。吐き気・めまい等を伴うことがある。'},
  msd:{n:'月経痛(MSDマニュアル家庭版)',u:'https://www.msdmanuals.com/home/women-s-health-issues/menstrual-disorders-and-abnormal-uterine-bleeding/menstrual-cramps',x:'痛みは開始の約24時間後に最も強く、2〜3日で軽くなる。30%以上で日常生活に支障。受診を考える徴候: 突然の新しい強い痛み、持続する痛み、発熱、膿のようなおりもの。'},
  heat1:{n:'Jo & Lee 2018(メタ分析)',u:'https://pubmed.ncbi.nlm.nih.gov/30389956/',x:'下腹部の温熱は月経痛を減らす可能性(試験は少なく小規模)。'},
  heat2:{n:'温熱療法のメタ分析 2026',u:'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12876241/',x:'無治療より痛みを減らす可能性が高く、NSAIDsと同程度の鎮痛が得られる可能性。'},
  selfcare:{n:'Armour ほか 2019(メタ分析)',u:'https://link.springer.com/article/10.1186/s12906-019-2433-8',x:'運動と温熱は、月経痛の強さを鎮痛薬より下げる方向(効果量いずれも0.48)。'},
  physio:{n:'理学療法のメタ分析 2021',u:'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8345570/',x:'ストレッチやヨガ等を含む介入で月経痛が軽くなる傾向。研究間のばらつきが大きい。'},
  mcnulty2020:{n:'McNulty ほか 2020, Sports Medicine(メタ分析)',u:'https://www.semanticscholar.org/paper/The-Effects-of-Menstrual-Cycle-Phase-on-Exercise-in-McNulty-Elliott-Sale/94feed7015969fe958c05860ab3c3727f472d00f',x:'運動成績は、月経初期に他の時期よりごくわずか低い可能性(効果量−0.06、証拠の質は低い)。研究間のばらつきが大きく、一律の運動調整の指針は支持されない。'},
  strengthUmbrella:{n:'筋力と周期のアンブレラレビュー 2023',u:'https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2023.1054542/full',x:'周期の時期は、急性の筋力にも、筋トレの適応にも影響しない。'},
  todStrength:{n:'時間帯と周期(JSAMS)',u:'https://www.jsams.org/article/S1440-2440(25)00445-1/fulltext',x:'握力・ジャンプ・膝伸展の筋力は、午後(16:30〜18:30)が午前(7:30〜9:00)より高い。周期との交互作用は、排卵期と黄体中期の膝伸展(非利き脚)だけ。夜型は朝の意欲が低く、午後に上がる。'},
  todReview:{n:'概日リズムと周期の系統的レビュー 2024',u:'https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2024.1347036/full',x:'時間帯と周期の交互作用を認めたのは2研究のみ。'},
  temp:{n:'周期と体温のレビュー',u:'https://www.tandfonline.com/doi/full/10.1080/23328940.2020.1735927',x:'黄体期の深部体温は卵胞期より0.3〜0.7℃高く、夜間の低下が小さい。'},
  lutealNight:{n:'睡眠を奪う実験での黄体期と卵胞期',u:'https://academic.oup.com/sleep/article/43/2/zsz227/5610591',x:'黄体期は夜間の認知成績が良く、約0.4℃の体温上昇が関与する可能性。卵胞期は体温の谷に近い夜間に覚醒度と成績が最も悪い。睡眠を削る前提の実験であり、夜更かしの根拠にはならない。'},
  sleepReview:{n:'周期と睡眠のレビュー',u:'https://pubmed.ncbi.nlm.nih.gov/38501513/',x:'無症状の周期では客観的な睡眠の連続性は変わらない。黄体期は睡眠紡錘波が増える。症状や月経痛がある人は、月経前・月経中に睡眠の質が悪くなりやすい。'},
  sleepQuality:{n:'周期と睡眠の質(395周期)',u:'http://einsteinlab.ca/wp-content/uploads/2016/04/Sleep-quality-and-the-menstrual-cycle.pdf',x:'月経前の主観的な睡眠の質は、中周期よりわずかに悪い(100点満点で約1.3点の差)。'},
  sleepStages:{n:'周期と睡眠段階(脳波研究のレビュー)',u:'https://link.springer.com/article/10.1007/s40675-020-00201-y',x:'黄体期にREM睡眠が減ることがある(最初の睡眠周期のみ)。紡錘波は月経の約3日前にピーク。'},
  moodReview:{n:'周期と気分の前向き研究のレビュー',u:'https://einsteinlab.ca/wp-content/uploads/2016/07/7-Mood-and-the-menstrual-cycle.pdf',x:'一般の人に月経前特有の否定的な気分変化があるという明確な証拠は不足。'},
  moodCount:{n:'月経前と否定的気分(47研究の検討)',u:'https://www.sciencedirect.com/science/article/abs/pii/S0005791616301495',x:'47研究の中で、月経前と否定的気分の関連が確認されたのは7研究。'},
  midCycleMood:{n:'周期の中ごろのポジティブ気分(予備研究)',u:'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9856962/',x:'周期の中ごろにポジティブ気分が上がるという予備研究。'},
  cogPMS:{n:'認知と周期・月経前障害のレビュー',u:'https://www.mdpi.com/2076-3425/10/4/198',x:'月経前症状が重い人ほど認知成績が悪い関連はあるが、重症でない限り臨床的な意味は小さい可能性。'},
  pmddStress:{n:'PMDDとストレス反応性',u:'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10476072/',x:'PMDDの女性は、黄体後期にストレス反応性が高い(健常対照比)。対象はPMDDの人で、一般の人への当てはめは未確認。'},
  cycleWear:{n:'WHOOP 2,596人・4.2万周期(2026)',u:'https://www.nature.com/articles/s41746-026-02799-9',x:'安静時心拍と皮膚温は黄体期に上がり、HRVは下がる。'},
  cycleWear2:{n:'Goodale ほか 2019 / Alzueta ほか 2024',u:'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6495289/',x:'ウェアラブルでも、黄体期の心拍上昇・皮膚温上昇が検出される。睡眠指標は周期で目立った変化がない報告もあります。'},
  nap:{n:'Bohn ほか 2021(メタ分析)',u:'https://pubmed.ncbi.nlm.nih.gov/34639511/',x:'短い昼寝で認知成績が小さく改善(全体の効果量0.18、注意で0.29)。大半が実験室研究。'},
  nap10:{n:'Tietzel & Lack 2002',u:'https://pubmed.ncbi.nlm.nih.gov/12220317/',x:'睡眠を制限した翌日の10分の昼寝で覚醒度と成績が改善(16人)。'},
  caffSleep:{n:'Drake ほか 2013(RCT, 12人)',u:'https://pmc.ncbi.nlm.nih.gov/articles/PMC3805807/',x:'就寝6時間前の400mgのカフェインで、客観的な睡眠時間が1時間以上減少。本人は気づきにくい。'},
  caffMens1:{n:'カフェインと月経関連症状(Medicine 2024)',u:'https://journals.lww.com/md-journal/fulltext/2024/12060/study_on_the_influencing_factors_of_primary.11.aspx',x:'多量摂取でリスク増の報告。十分な睡眠は月経痛の保護因子(観察研究)。'},
  caffMens2:{n:'カフェインと月経関連症状(PMC9819475)',u:'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9819475/',x:'有意な関連なしの報告もあり、研究で割れている。'},
  baseHRV:{n:'HRVに基づく負荷調整のレビュー 2026',u:'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC13558445/',x:'個人の基準値からのずれで負荷を調整する方法は、持久系運動で小さな改善を示した研究があります。日々の作業状態への適用は未検証です。'},
  readiness:{n:'準備度・回復スコアのレビュー 2025',u:'https://www.degruyterbrill.com/document/doi/10.1515/teb-2025-0001/html?lang=en',x:'算出方法が非公開で検証が不十分。主観的な準備感は指標と一致しないことがある。'}
};
/* 根拠の強さ(GRADE)。meta=メタ分析あり / rct=小規模な試験 / obs=観察研究のみ / mixed=根拠が割れている / none=文献なし(設計案) / safety=安全上の注記 / def=診断基準・定義 */
const GRADE={meta:'メタ分析あり',rct:'小規模な試験',obs:'観察研究のみ',mixed:'根拠が割れている',none:'設計案(暫定)',safety:'安全上の注記',def:'診断基準・定義'};
/* 「根拠」を開いたときに出す、強さごとの限界 */
const GRADE_LIMIT={
  meta:'メタ分析でも、含まれる試験が少ない・小規模・研究間のばらつきが大きい、といった限界があります。',
  rct:'少人数の試験で、他の人や他の場面に当てはまるかは未確認です。',
  obs:'観察研究のため、原因と結果の関係は分かりません。',
  mixed:'研究によって結果が割れており、結論は出ていません。',
  none:'文献の裏づけがない設計案で、効果は未検証です。合わなければ無視して構いません。',
  safety:'受診の目安としての注記で、診断ではありません。',
  def:'診断基準や定義の説明で、個々の人の症状の出方とは一致しないことがあります。'
};

/* ===== 周期の統計と、時期(窓)の判定。DOMに依存しない純関数 ===== */
/* 周期の長さ(開始日の間隔)を、いつもと違う間隔を外して平均する。直近6つのうち
   ・18〜60日の範囲外は使わない(記録漏れや不正出血の可能性)
   ・3つ以上あるときは、中央値から5日を超えて離れた間隔を外す(外して2つ未満になるなら外さない)
   残った間隔の平均(四捨五入)が周期の長さ。記録が少ないうちほど、1つの外れ値で平均がずれるのを防ぐ */
function robustLen(starts){
  const raw=[];for(let i=1;i<starts.length;i++)raw.push({from:starts[i-1],to:starts[i],L:diffDays(starts[i],starts[i-1])});
  const recent=raw.slice(-6),valid=recent.filter(x=>x.L>=18&&x.L<=60);
  let kept=valid,dropped=recent.filter(x=>!valid.includes(x)).map(x=>({...x,why:'range'}));
  if(valid.length>=3){
    const m=median(valid.map(x=>x.L)),k=valid.filter(x=>Math.abs(x.L-m)<=5);
    if(k.length>=2){kept=k;dropped=dropped.concat(valid.filter(x=>!k.includes(x)).map(x=>({...x,why:'outlier'})))}
  }
  const ls=kept.map(x=>x.L);
  return {L:ls.length>=2?Math.round(mean(ls)):null,kept,dropped,spreadKept:ls.length>=2?Math.max(...ls)-Math.min(...ls):null,raw:recent};
}
function cycleStats(starts){
  const r=robustLen(starts),rr=r.raw.map(x=>x.L);
  const spread=rr.length>=2?Math.max(...rr)-Math.min(...rr):null;
  /* 規則的とみなす条件: 残した間隔のばらつきが7日以内で、外した間隔が全体の3分の1以下 */
  const reliable=r.L!=null&&r.spreadKept<=7&&r.dropped.length<=Math.floor(rr.length/3);
  return {avg:r.L,spread,reliable,min:rr.length?Math.min(...rr):null,max:rr.length?Math.max(...rr):null,dropped:r.dropped,kept:r.kept};
}
/* ===== 実測による排卵・黄体期の補正 =====
   一般的な平均(排卵=次の月経の約14日前)の代わりに、その人自身の皮膚温から黄体期の長さを推定する。
   手首の皮膚温は日々のばらつき(約0.4℃)が排卵後の上昇(0.3〜0.5℃ほど)と同じ大きさなので、1周期だけでは判定できない。
   そこで「黄体期が L 日なら、排卵の前後で体温がどれだけ上がるか」を周期ごとに出し、複数周期の平均が最も大きい L を採る。
   使うのは、4周期以上で平均+0.25℃以上、周期間の t 値が3以上、4分の3以上の周期で上昇のときだけ(L を変えても差がほぼ同じ=上昇の位置が特定できないときは、この基準を満たさない)。それ以外は一般的な平均のまま。 */
const variance=a=>{if(a.length<2)return 0;const m=mean(a);return a.reduce((s,x)=>s+(x-m)*(x-m),0)/(a.length-1)};
/* 1周期ぶんの日別皮膚温(temps[0]=周期1日目、欠測は null)で、黄体期が lut 日と仮定したときの「排卵後 − 排卵前」(℃)。月経期(1〜5日目)は基準に使わない */
function stepAt(temps,lut){
  const n=temps.length,k=n-lut;   // 添字 k = 排卵の翌日(周期 n-lut+1 日目)
  const pre=[],post=[];
  for(let i=5;i<k;i++)if(temps[i]!=null)pre.push(temps[i]);
  for(let i=k;i<Math.min(n,k+12);i++)if(temps[i]!=null)post.push(temps[i]);
  if(pre.length<5||post.length<4)return null;
  return mean(post)-mean(pre);
}
/* starts=月経開始日(昇順)、days=[{date,temp}]。直近6周期のうち、日別皮膚温が6割以上そろった周期だけ見る */
function personalLuteal(starts,days){
  const by=new Map();for(const d of days||[])if(d&&d.temp!=null)by.set(d.date,d.temp);
  const S=(starts||[]).slice(),cyc=[];
  for(let i=Math.max(0,S.length-7);i+1<S.length;i++){
    const len=diffDays(S[i+1],S[i]);if(len<18||len>60)continue;
    const temps=[];let have=0;
    for(let k=0;k<len;k++){const v=by.get(addDays(S[i],k));temps.push(v==null?null:v);if(v!=null)have++}
    if(have>=len*0.6)cyc.push({start:S[i],len,temps});
  }
  const out={n:0,of:cyc.length,L:null,shift:null,t:null,items:[],ok:false};
  if(cyc.length<2)return out;
  let best=null;
  for(let L=9;L<=17;L++){
    const ds=cyc.map(c=>stepAt(c.temps,L)),v=ds.filter(x=>x!=null);
    if(v.length<2)continue;
    const m=mean(v),se=Math.sqrt(variance(v)/v.length)||1e-9,t=m/se;
    if(!best||m>best.m)best={L,m,t,ds,v};
  }
  if(!best)return out;
  out.L=best.L;out.shift=best.m;out.t=best.t;out.n=best.v.length;
  out.items=cyc.map((c,i)=>({start:c.start,len:c.len,d:best.ds[i]}));
  out.ok=best.v.length>=4&&best.m>=0.25&&best.t>=3&&best.v.filter(x=>x>0).length>=best.v.length*0.75;
  return out;
}
const WINDOWS={
  W_M1:{name:'月経1〜2日目',conf:'高'},
  W_M2:{name:'月経3〜5日目',conf:'高'},
  W_F:{name:'月経後〜排卵前',conf:'中'},
  W_O:{name:'排卵期前後',conf:'低'},
  W_L1:{name:'黄体期前半',conf:'低〜中'},
  W_L2:{name:'月経前(次の月経の7日前〜前日)',conf:'中'}
};
/* starts=月経開始日(昇順)、today=今日。opt.bleeding=今日も出血の記録がある(6日目以降でも月経期として扱う)。
   窓が出せないときは id=null と、画面に出す説明 note を返す */
function windowFor(starts,today,opt){
  opt=opt||{};
  const S=(starts||[]).filter(s=>s<=today);
  if(!S.length)return {id:null,day:null,note:'月経開始日の記録がありません。'};
  const last=S[S.length-1],day=diffDays(today,last)+1;
  const make=id=>({id,name:WINDOWS[id].name,conf:WINDOWS[id].conf,day,note:null});
  if(day>70)return {id:null,day,note:'最後の月経の記録から70日以上経っているため、時期は推定しません。'};
  const mens=Math.max(2,Math.min(10,opt.mens||5));   // opt.mens=記録された月経の日数(中央値)。無ければ一般的な5日
  if(day<=Math.min(2,mens))return make('W_M1');
  if(day<=mens||opt.bleeding)return make('W_M2');
  const st=cycleStats(S);
  if(!st.reliable){
    return {id:null,day,note:'月経から'+day+'日目。'+(st.avg==null||st.spread==null?'周期の記録がまだ少ないため':'周期は'+st.min+'〜'+st.max+'日とばらつくため')+'、時期は推定しません。'};
  }
  const avg=st.avg,ovu=avg-(opt.lut||12),d=avg-day+1;   // opt.lut=実測の黄体期(日)。無ければ一般的な平均
  if(day>avg+7)return {id:null,day,note:'月経から'+day+'日目。平均周期(約'+avg+'日)を1週間以上過ぎているため、時期は推定しません。'};
  let id;
  if(d<=7)id='W_L2';
  else if(Math.abs(day-ovu)<=2)id='W_O';
  else if(day<ovu)id='W_F';
  else id='W_L1';
  const w=make(id);w.avg=avg;w.toNext=d;w.ovu=ovu;return w;
}

/* ===== 知識ベース(KB)。1エントリ = {window, category, text, grade, refs[], when} =====
   category: symptom 症状 / task タスク / sleep 睡眠 / exercise 運動 / mood 気分・ストレス / caution 注意
   when: always=いつも / heavy=体感が「重い」のとき(月経3〜5日目で、症状が残る日の代わりに使う) */
const KB=[];
(function(){
  const add=(window,category,text,grade,refs,when)=>KB.push({window,category,text,grade,refs,when:when||'always'});
  /* W_M1 */
  add('W_M1','symptom','月経痛が最も強い時期で、数時間前〜直後に始まり1〜2日目が最も強い人が多く、約24時間後にピークとする解説があります。2〜3日で軽くなり、吐き気・めまいを伴うことがあります。','obs',['glowm','msd']);
  add('W_M1','task','痛みやだるさがあれば、定型・整理・復習・環境構築を中心にできます。痛みがなければ通常どおりで、周期で認知成績は系統的に変わらないというメタ分析があるため、症状の有無で決めます。','none',['jang2025']);
  add('W_M1','sleep','月経痛がある人は、月経中に睡眠の質が悪くなりやすいという報告があります。夜に痛みが強いと睡眠が削られやすいので、就寝の6時間前以降のカフェインを控えることを試せます。','obs',['sleepReview','caffSleep']);
  add('W_M1','exercise','運動成績は他の時期よりごくわずか低い可能性がありますが、一律の調整は支持されないため、体感で強度を決められます。痛みの出ない範囲の軽いストレッチ・ヨガは月経痛を軽くする傾向があり、下腹部の温熱は痛みを減らす可能性があります。','meta',['mcnulty2020','physio','selfcare','heat1','heat2']);
  add('W_M1','mood','月経中の気分には、一貫した傾向は報告されていません。','mixed',['moodReview']);
  add('W_M1','caution','痛みが日常に支障を出すほど強い、突然の新しい強い痛み、持続する痛み、発熱があるときは、医療機関で相談できます。','safety',['msd']);
  /* W_M2: 睡眠・運動・気分・注意は、症状が残る日(体感が「重い」)だけ W_M1 と同じ注記を出す */
  add('W_M2','symptom','痛みは軽くなってくる時期で、PMSの定義では、症状は月経開始から4日以内に消えるとされています。','def',['acogPMS']);
  add('W_M2','task','症状に合わせて、中難度から高難度の作業へ戻していくことができます。','none',[]);
  for(const k of ['sleep','exercise','mood','caution']){
    const m=KB.find(e=>e.window==='W_M1'&&e.category===k);
    add('W_M2',k,m.text,m.grade,m.refs,'heavy');
  }
  /* W_F */
  add('W_F','symptom','症状のない区間とされる時期です(月経4日目ごろ〜排卵)。診断基準での扱いなので、実際の症状の出方には個人差があります。','def',['pmddFree']);
  add('W_F','task','症状が出にくい窓として、新しい学習・難しい作業・長い集中を置きやすい時期です。周期で認知成績は変わらないため、これは「症状が出にくい確率が高い」という意味です。','none',['jang2025']);
  add('W_F','sleep','無症状の周期では、睡眠の連続性は周期で変わらないというレビューがあります。','obs',['sleepReview']);
  add('W_F','exercise','時期による一律の運動の調整は必要ない、という結論のレビューがあります。','meta',['strengthUmbrella','mcnulty2020']);
  add('W_F','mood','周期の中ごろ(排卵期前後)にポジティブ気分が上がるという予備研究があります。','obs',['midCycleMood']);
  /* W_O */
  add('W_O','task','症状が出にくい窓として、新しい学習・難しい作業・長い集中を置きやすい時期です。周期で認知成績は変わらないため、これは「症状が出にくい確率が高い」という意味です。','none',['jang2025']);
  add('W_O','task','一部の研究で処理速度・注意・作業記憶のわずかな向上が報告されていますが、有意に届かない研究も多くあります。','mixed',['jang2025']);
  add('W_O','exercise','筋力は午前より午後(16:30〜18:30)に高い、という報告があります。周期との交互作用は、排卵期・黄体中期の膝伸展だけで、一貫しません。','rct',['todStrength','todReview']);
  add('W_O','caution','排卵は次の月経の約12日前(黄体期の平均12.4日、幅は7〜17日)で、14日目とは限りません。この窓は推定が外れやすいです。','obs',['bull2019']);
  /* W_L1 */
  add('W_L1','symptom','体温が0.3〜0.7℃上がり、夜間の下がり方が小さくなります。安静時心拍が上がりHRVが下がるため、回復の指標が「悪く」見えますが、周期由来のことがあります。','meta',['temp','cycleWear']);
  add('W_L1','task','通常運転にできます。','none',[]);
  add('W_L1','sleep','睡眠紡錘波が増え、REM睡眠が減ることがあります。睡眠時間そのものは削らないほうが安心です。','obs',['sleepReview','sleepStages']);
  add('W_L1','exercise','時期による一律の調整は不要です。体温が高い分、暑い環境では体感に注意できます。','none',[]);
  /* W_L2 */
  add('W_L2','symptom','PMS症状の出現期で、身体症状(腹部膨満、乳房痛、頭痛、関節痛・筋肉痛、むくみ、体重増)や情動症状(不安、いらだち)が出る人がいます。軽い症状は月経の1〜2日前だけの人も多いです。','def',['pmsTiming','acogPMS','phaseProj']);
  add('W_L2','task','難しい作業は前倒しにし、当日は定型・整理・復習にできます。主観的に集中しにくいと感じる人がいますが、検査成績は変わらないという報告もあります。','none',['cogPMS','jang2025']);
  add('W_L2','sleep','月経前の主観的な睡眠の質は、わずかに悪くなる傾向があります(100点満点で約1.3点の差)。紡錘波は月経の約3日前にピークで、睡眠時間は削らないほうが安心です。','obs',['sleepQuality','sleepStages']);
  add('W_L2','exercise','一律の調整は不要で、体感で決められます。','meta',['mcnulty2020']);
  add('W_L2','mood','一般の人では、月経前の否定的な気分は一貫しません(47研究のうち確認は7研究)。PMDDの人は黄体後期にストレス反応性が高いという報告がありますが、一般の人への当てはめは未確認です。','mixed',['moodCount','pmddStress']);
  add('W_L2','caution','カフェインと月経関連症状の関連は研究で割れています。減らすのは試す候補です。','mixed',['caffMens1','caffMens2']);
  add('W_L2','caution','症状が日常に支障を出すほど強いときは、医療機関で相談できます。','safety',['acogPMS']);
})();
/* 窓に依存しない補足(該当するときだけ出す) */
const KB_COMMON={
  sleepShort:{text:'睡眠が基準より短い日は、昼過ぎまでの10〜20分の昼寝(長いと夜に響きます)と、就寝の6時間前までのカフェインを試せます。',grade:'meta',refs:['nap','nap10','caffSleep']},
  hrOffMatched:{text:'夜間の心拍・HRVは、同じ周期日の過去値と比べているため、周期由来のずれは補正済みです。',grade:'obs',refs:['cycleWear']},
  hrOffRaw:{text:'夜間の心拍・HRVが基準からずれています。同じ周期日の過去データが足りず、周期の補正はできていません。',grade:'obs',refs:['cycleWear']},
  tierNote:{text:'このツールの3段階(深い/手を動かす/整える)は、市販のスコアと同様に暫定の目安です。',grade:'none',refs:['readiness']}
};
const CAT_ORDER=['symptom','task','sleep','exercise','mood','caution'];
const CAT_LABEL={symptom:'症状',task:'タスク',sleep:'睡眠',exercise:'運動',mood:'気分・ストレス',caution:'注意'};
/* 今日の見立て。A=assess の結果(無ければ null)、feel=体感(light/normal/heavy)、starts=月経開始日 */
function buildDaily(A,today,feel,starts,opt){
  const w=windowFor(starts,today,opt);
  const heavy=feel==='heavy';
  const stale=!A||!!A.stale;
  const rows=[];
  for(const cat of CAT_ORDER){
    let items;
    if(heavy&&cat==='task')items=KB.filter(e=>e.window==='W_M1'&&e.category==='task');   // 体感が「重い」ときは、窓にかかわらず月経1日目のタスク記述
    else items=w.id?KB.filter(e=>e.window===w.id&&e.category===cat&&(e.when==='always'||(e.when==='heavy'&&heavy))):[];
    if(items.length)rows.push({cat,label:CAT_LABEL[cat],items});
  }
  const extras=[];
  if(!stale){   // 時計のデータが古いときは、生理指標に基づく補足を出さない
    if(A.sleepLow)extras.push(KB_COMMON.sleepShort);
    if(A.rhrHigh||A.hrvLow)extras.push((A.sig.rhr.matched||A.sig.hrv.matched)?KB_COMMON.hrOffMatched:KB_COMMON.hrOffRaw);
    if(A.tier||heavy)extras.push(KB_COMMON.tierNote);
  }
  return {window:w,heavy,stale,rows,extras};
}

/* ===== 判定 ===== */
const FLOOR2={sleep:30,rhr:1.5,hrv:6,temp:0.12,ex:10};
function robust(vals,floorKey){
  const m=median(vals),mad=median(vals.map(v=>Math.abs(v-m)));
  return {m,sd:Math.max(1.4826*mad,FLOOR2[floorKey]),lo:pct(vals,.1),hi:pct(vals,.9),n:vals.length};
}
function baseline(days,i,key){
  const vals=[];
  for(let j=Math.max(0,i-28);j<i;j++){const v=days[j][key];if(v!=null)vals.push(v)}
  if(vals.length<7)return null;
  return robust(vals,key);
}
function lastStartLE(starts,date){let l=null;for(const s of starts){if(s<=date)l=s;else break}return l}
function cycleDayAt(starts,date){const l=lastStartLE(starts,date);if(!l)return null;const d=diffDays(date,l)+1;return d>70?null:d}
/* 同じ周期日(±2日)の、過去の周期での値と比べる */
function baselineMatched(days,i,key,starts){
  const cd=cycleDayAt(starts,days[i].date);if(cd==null)return null;
  const curStart=lastStartLE(starts,days[i].date),vals=[],cyc=new Set();
  for(let j=0;j<i;j++){
    const v=days[j][key];if(v==null)continue;
    const st=lastStartLE(starts,days[j].date);if(!st||st===curStart)continue;
    const cj=diffDays(days[j].date,st)+1;if(cj>70)continue;
    if(Math.abs(cj-cd)<=2){vals.push(v);cyc.add(st)}
  }
  if(vals.length<5||cyc.size<2)return null;
  const r=robust(vals,key);r.matched=true;r.cycles=cyc.size;return r;
}
function cycleCtx(model,date,days,ti){
  const starts=model.starts.filter(s=>s<=date);
  if(!starts.length)return null;
  const last=starts[starts.length-1],day=diffDays(date,last)+1;
  if(day>70)return {stale:true,day,last};
  const {avg,spread,reliable,min,max}=cycleStats(starts);
  let phase='mid';
  if(day<=((typeof recMens==='function'&&recMens(model.starts))||5))phase='menses';else if(reliable&&day>=avg-6)phase='pre';
  const toNext=reliable?avg-day+1:null;
  let warm=null;
  if(day>=12){
    const foll=[];for(let k=2;k<=9;k++){const di=days.findIndex(x=>x.date===addDays(last,k));if(di>=0&&days[di].temp!=null)foll.push(days[di].temp)}
    const rc=[];for(let k=Math.max(0,ti-2);k<=ti;k++)if(days[k].temp!=null)rc.push(days[k].temp);
    if(foll.length>=4&&rc.length>=2)warm=mean(rc)-mean(foll)>=0.15;
  }
  return {last,day,avg,phase,toNext,warm,spread,reliable,min,max};
}
function assess(model,today){
  const days=model.days;if(!days.length)return null;
  let ti=days.length-1;
  while(ti>0&&days[ti].sleep==null&&days[ti].rhr==null&&days[ti].temp==null&&days[ti].hrv==null)ti--;
  const t=days[ti],A={date:t.date,idx:ti,sig:{},reasons:[]};
  const hasCycle=model.starts.length>=2&&cycleDayAt(model.starts,t.date)!=null;
  A.uncorrected=false;
  for(const k of ['sleep','rhr','hrv','temp']){
    const v=t[k];let b=null,matched=false;
    if(k!=='sleep'&&hasCycle){b=baselineMatched(days,ti,k,model.starts);matched=!!b}
    if(!b){b=baseline(days,ti,k);if(k!=='sleep'&&k!=='temp'&&hasCycle&&b&&v!=null)A.uncorrected=true}
    A.sig[k]={v,b,z:(v!=null&&b)?(v-b.m)/b.sd:null,matched};
  }
  const prev=ti>0?days[ti-1]:null,bex=baseline(days,ti,'ex');
  A.prevEx=prev&&prev.ex!=null?{v:prev.ex,b:bex,z:bex?(prev.ex-bex.m)/bex.sd:null}:null;
  A.sleepLow=A.sig.sleep.z!=null&&A.sig.sleep.z<=-1;
  A.rhrHigh=A.sig.rhr.z!=null&&A.sig.rhr.z>=1;
  A.hrvLow=A.sig.hrv.z!=null&&A.sig.hrv.z<=-1;
  A.autoLoad=A.rhrHigh||A.hrvLow;
  A.exHigh=!!(A.prevEx&&A.prevEx.z!=null&&A.prevEx.z>=1.5&&A.prevEx.v>=60);
  A.hasBase=!!(A.sig.sleep.b||A.sig.rhr.b||A.sig.hrv.b);
  A.strain=(A.sleepLow?1:0)+(A.autoLoad?1:0)+(A.exHigh?1:0);
  A.tier=A.hasBase?(A.strain===0?'A':A.strain===1?'B':'C'):null;
  A.cycleData=cycleCtx(model,A.date,days,ti);
  A.stale=!!today&&diffDays(today,A.date)>=2;
  A.cycle=A.stale?cycleCtx(model,today,days,days.length-1):A.cycleData;
  if(A.stale){A.sleepLow=A.rhrHigh=A.hrvLow=A.autoLoad=A.exHigh=false;A.strain=0;A.tier=null;A.hasBase=false}
  return A;
}

/* ===== フェーズ5: あなたのデータ(探索的)。固定の数値は埋め込まず、実データから毎回計算する ===== */
const PRE_KEYS=[{k:'rhr',label:'夜間の心拍',dir:1,hi:'高め',unit:' bpm',dec:1},{k:'hrv',label:'夜間のHRV',dir:-1,hi:'低め',unit:' ms',dec:1},{k:'temp',label:'皮膚温',dir:1,hi:'高め',unit:' ℃',dec:2}];
/* 月経開始の1〜7日前の窓と、それ以外(月経期・直前の窓を除いた)の日の平均の差を、周期ごとに出す。
   2周期以上で、差が同じ向き(心拍・皮膚温は高め、HRVは低め)かつ測定の下限(FLOOR2)の半分以上のときだけ「傾向」とする */
function personalPreHint(days,starts,A,opt){
  const S=[...new Set(starts)].sort(),by=new Map(days.map(d=>[d.date,d]));
  const per={rhr:[],hrv:[],temp:[]};let cycles=0;
  for(let i=1;i<S.length;i++){
    const prev=S[i-1],next=S[i],len=diffDays(next,prev);
    if(len<18||len>60)continue;
    cycles++;
    for(const {k} of PRE_KEYS){
      const pre=[],ref=[];
      for(let j=0;j<len;j++){
        const d=addDays(prev,j),v=by.has(d)?by.get(d)[k]:null;if(v==null)continue;
        const toNext=diffDays(next,d);
        if(toNext>=1&&toNext<=7)pre.push(v);else if(j+1>=6&&toNext>=9)ref.push(v);
      }
      if(pre.length>=3&&ref.length>=5)per[k].push(mean(pre)-mean(ref));
    }
  }
  const metrics=[];
  for(const p of PRE_KEYS){
    const a=per[p.k];if(a.length<2)continue;
    const med=median(a);
    if(a.every(x=>x*p.dir>0)&&Math.abs(med)>=FLOOR2[p.k]/2)metrics.push({...p,med,n:a.length});
  }
  const now=[];
  if(A&&!A.stale&&metrics.length&&A.idx!=null&&!(opt&&opt.noNow)){
    for(const m of metrics){
      const rc=[];for(let j=Math.max(0,A.idx-2);j<=A.idx;j++)if(days[j][m.k]!=null)rc.push(days[j][m.k]);
      const b=baseline(days,A.idx,m.k);
      if(rc.length>=2&&b&&(mean(rc)-b.m)*m.dir>=FLOOR2[m.k]/2)now.push(m.k);
    }
  }
  const evaluated=PRE_KEYS.filter(p=>per[p.k].length>=2).length;
  return {cycles,metrics,now,evaluated,nowAll:metrics.length>0&&now.length===metrics.length};
}
const fmtSigned=(x,dec)=>(x>=0?'+':'−')+Math.abs(x).toFixed(dec);
function personalLines(h){
  if(!h)return [];
  if(h.cycles<2)return ['完了した周期が2つ以上そろうと、あなたの月経前の傾向を計算します(いまは'+h.cycles+'周期)。'];
  if(!h.metrics.length)return ['あなたの過去'+h.cycles+'周期では、月経開始の1〜7日前の窓に、夜間の心拍・HRV・皮膚温の一貫した傾向は見られませんでした(探索的)。'];
  const L=['あなたの過去の月経前の窓(月経開始の1〜7日前)では、'+h.metrics.map(m=>m.label+'が'+m.hi+'(中央値'+fmtSigned(m.med,m.dec)+m.unit+'、'+m.n+'周期)').join('、')+'でした。探索的な傾向で、原因や診断を示すものではありません。'];
  if(h.now.length)L.push('今の値も同じ方向にずれている項目('+h.metrics.filter(m=>h.now.includes(m.k)).map(m=>m.label).join('、')+')があり、月経前の窓に入っている可能性があります(推定)。');
  return L;
}

/* ===== サンプルデータ ===== */
function demoModel(today){
  let seed=11;
  const rnd=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  const g=()=>(rnd()+rnd()+rnd()+rnd()-2)/0.58;
  const lens=[28,29,27,28,30,28];
  const starts=[addDays(today,-24)];
  for(const L of lens)starts.unshift(addDays(starts[0],-L));
  const first=starts[0],n=diffDays(today,first)+1,days=[],period=[];
  for(let i=0;i<n;i++){
    const d=addDays(first,i);
    let si=0;for(let k=0;k<starts.length;k++)if(starts[k]<=d)si=k;
    const cd=diffDays(d,starts[si])+1,len=si<starts.length-1?diffDays(starts[si+1],starts[si]):28;
    if(cd<=5)period.push(d);
    const lut=cd>=len-13;
    const pre=cd>=len-5;
    const wd=new Date(dateToUTC(d)).getUTCDay();
    let sleep=Math.round(425+g()*38-(pre?18:0)-(cd<=2?12:0));
    let rhr=Math.round((53+g()*1.1+(lut?1.8:0)+(pre?0.8:0))*10)/10;
    let temp=Math.round((33.15+(lut?0.34:0)+g()*0.07)*100)/100;
    let hrv=Math.round(64-(lut?7:0)-(pre?3:0)+g()*5);
    let ex=(wd===0||wd===6)?(rnd()<.7?Math.round(35+rnd()*55):0):(rnd()<.45?Math.round(20+rnd()*45):0);
    if(d===today){sleep=372;rhr=Math.round((rhr+1.4)*10)/10;hrv-=4}
    days.push({date:d,sleep,rhr,hrv,temp,ex});
  }
  return {days,period,starts:groupStarts(period),v:1,demo:true};
}
