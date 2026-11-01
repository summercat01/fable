/* eslint-disable @typescript-eslint/no-require-imports */
// 아직 발표 안 된 해의 공휴일 예상 계산: npm i --no-save korean-lunar-calendar && node scripts/predict_holidays.cjs 2030
// 규칙: 설·추석 3일(일요일·다른 공휴일과 겹치면 대체), 국경일·어린이날·부처님오신날·노동절·성탄절(토·일·겹치면 대체), 신정·현충일은 대체 없음
const K = require("korean-lunar-calendar");
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const D = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
const add = (d, n) => new Date(d.getTime() + n * 864e5);
const lunar = (y, m, d) => { const c = new K(); c.setLunarDate(y, m, d, false); const s = c.getSolarCalendar(); return D(s.year, s.month, s.day); };

function gen(y) {
  const map = {}; // iso -> names
  const put = (d, n) => (map[iso(d)] ??= []).push(n);
  const groups = []; // {days:[Date], name, sub:'weekend'|'sunday'|false}
  const fixed = [[1,1,"1월 1일",false],[3,1,"3ㆍ1절","weekend"],[5,1,"노동절","weekend"],[5,5,"어린이날","weekend"],[6,6,"현충일",false],[7,17,"제헌절","weekend"],[8,15,"광복절","weekend"],[10,3,"개천절","weekend"],[10,9,"한글날","weekend"],[12,25,"기독탄신일","weekend"]];
  for (const [m,d,n,sub] of fixed) groups.push({ days: [D(y,m,d)], names: [n], name: n, sub });
  const seol = lunar(y,1,1), chu = lunar(y,8,15), bud = lunar(y,4,8);
  groups.push({ days: [add(seol,-1), seol, add(seol,1)], names: ["설날 전날","설날","설날 다음 날"], name: "설날", sub: "sunday" });
  groups.push({ days: [add(chu,-1), chu, add(chu,1)], names: ["추석 전날","추석","추석 다음 날"], name: "추석", sub: "sunday" });
  groups.push({ days: [bud], names: ["부처님 오신 날"], name: "부처님 오신 날", sub: "weekend" });
  for (const g of groups) g.days.forEach((d, i) => put(d, g.names[i]));
  const isHol = (d) => !!map[iso(d)];
  const wk = (d) => d.getUTCDay();
  // 대체가 필요한 묶음: 시간순
  const need = groups.filter((g) => g.sub && g.days.some((d) => (g.sub === "weekend" ? wk(d) === 0 || wk(d) === 6 : wk(d) === 0) || map[iso(d)].length > 1));
  need.sort((a, b) => a.days[0] - b.days[0]);
  for (const g of need) {
    let d = add(g.days[g.days.length - 1], 1);
    while (wk(d) === 0 || wk(d) === 6 || isHol(d)) d = add(d, 1);
    put(d, `대체공휴일(${g.name})`);
  }
  return Object.fromEntries(Object.entries(map).sort());
}
module.exports = gen;
if (require.main === module) {
  for (const y of process.argv.slice(2)) console.log(JSON.stringify(gen(+y), null, 0));
}
