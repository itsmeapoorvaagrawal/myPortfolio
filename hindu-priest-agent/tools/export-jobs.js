// सारे श्लोकों और मंत्रों के पाठ की सूची बनाता है, जिनकी आवाज़ बनवानी है।
// चलाइए: node tools/export-jobs.js   ->   tools/audio-jobs.json
// इस फ़ाइल को Colab नोटबुक (tools/generate_audio.ipynb) में अपलोड करना है।
const fs = require('fs');
const path = require('path');
const POOJAS = require('../public/poojas.js');
const LIB = require('../public/mantras.js');
const { key } = require('../public/audiokey.js');

const jobs = new Map();
const add = (title, text, sample = false) => {
  if (!text || /[{}]/.test(text)) return;          // {नाम}, {गोत्र} वाले संकल्प की रिकॉर्डिंग नहीं बनती
  const k = key(text);
  if (!jobs.has(k)) jobs.set(k, { key: k, title, text, sample });
  else if (sample) jobs.get(k).sample = true;
};
// पहले परखने के लिए कुछ छोटे और जाने-पहचाने मंत्र
const SAMPLE_IDS = new Set(['shiv.mrityunjaya', 'general.gayatri', 'ganesh.vakratunda', 'shiv.karpur', 'ganesh.beej']);

LIB.forEach((d) => d.items.forEach((i) => add(d.name + ' / ' + i.title, i.text, SAMPLE_IDS.has(i.id))));
POOJAS.forEach((p) => p.steps.forEach((s) => add(p.name + ' / ' + s.title, s.sloka)));

const out = [...jobs.values()];
fs.writeFileSync(path.join(__dirname, 'audio-jobs.json'), JSON.stringify(out, null, 1), 'utf8');
const chars = out.reduce((n, j) => n + j.text.length, 0);
console.log(`${out.length} पाठ, कुल ${chars} अक्षर; पहले परखने के लिए ${out.filter((j) => j.sample).length}`);
