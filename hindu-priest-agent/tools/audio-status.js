// रिकॉर्डिंग की स्थिति: कितने मंत्र बन चुके, कितने बाकी।  चलाइए: node tools/audio-status.js
const fs = require('fs');
const path = require('path');
require('child_process').execFileSync(process.execPath, [path.join(__dirname, 'export-jobs.js')], { stdio: 'ignore' });   // सूची ताज़ा करना
const jobs = JSON.parse(fs.readFileSync(path.join(__dirname, 'audio-jobs.json'), 'utf8'));
const dir = path.join(__dirname, '..', 'public', 'audio');
const have = new Set(fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)) : []);
const done = jobs.filter((j) => have.has(j.key)), todo = jobs.filter((j) => !have.has(j.key));
const mb = [...have].reduce((n, k) => n + fs.statSync(path.join(dir, k + '.mp3')).size, 0) / 1048576;
const group = (j) => j.title.split(' / ')[0];
const by = {}; jobs.forEach((j) => { const g = group(j); by[g] = by[g] || { total: 0, done: 0 }; by[g].total++; if (have.has(j.key)) by[g].done++; });
console.log(`कुल पाठ: ${jobs.length} | बन चुके: ${done.length} | बाकी: ${todo.length} | अक्षर बाकी: ${todo.reduce((n, j) => n + j.text.length, 0)} | अभी की फ़ाइलें: ${mb.toFixed(1)} MB`);
console.log('लंबे पाठ (260+ अक्षर) बाकी: ' + todo.filter((j) => j.text.length > 260).length + ' (इनमें ज़्यादा GPU-समय लगता है)');
console.log('\nसमूह के अनुसार:');
Object.entries(by).forEach(([g, v]) => console.log('  ' + g.padEnd(34) + v.done + ' / ' + v.total));
// बनी हुई फ़ाइलें जो अब किसी पाठ से नहीं जुड़तीं (पाठ बदलने पर ऐसा होता है)
const orphans = [...have].filter((k) => !jobs.some((j) => j.key === k));
if (orphans.length) console.log('\nध्यान: ' + orphans.length + ' रिकॉर्डिंग अब किसी पाठ से नहीं जुड़तीं (पाठ बदल गया)। ये बेकार हैं।');
