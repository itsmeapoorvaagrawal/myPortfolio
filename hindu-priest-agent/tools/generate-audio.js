// श्लोकों और मंत्रों की आवाज़ Hugging Face के Indic Parler-TTS Space से बनाता है।
//
//   node tools/export-jobs.js                         (पहले एक बार: बनाने वाले पाठों की सूची)
//   node tools/generate-audio.js --samples            (परखने के लिए कुछ मंत्र, दो-तीन आवाज़ों में)
//   node tools/generate-audio.js --all --speaker Aryan   (सारे मंत्र एक आवाज़ में)
//
// सुविधाएँ: जो फ़ाइल बन चुकी है उसे दोबारा नहीं बनाता, इसलिए रुककर फिर चलाया जा सकता है।
// नतीजा: नमूने -> public/audio-samples/, पूरे -> public/audio/ (साथ में manifest.json)।
const fs = require('fs');
const path = require('path');
const { tts } = require('./space-tts.js');

const args = process.argv.slice(2);
const flag = (n) => args.includes('--' + n);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

const jobsFile = path.join(__dirname, 'audio-jobs.json');
if (!fs.existsSync(jobsFile)) { console.error('पहले चलाइए: node tools/export-jobs.js'); process.exit(1); }
const jobs = JSON.parse(fs.readFileSync(jobsFile, 'utf8'));

// आवाज़ का वर्णन: Parler-TTS में बोलने वाले का नाम और शैली अंग्रेज़ी में लिखी जाती है।
// मॉडल के पन्ने पर संस्कृत के लिए Aryan और हिंदी के लिए Rohit और Divya नाम बताए गए हैं।
const describe = (speaker, style) => {
  const styles = {
    chant: `${speaker} chants slowly in a deep, calm, devotional voice, with clear pronunciation and a short pause after each phrase. The recording is very high quality with no background noise.`,
    plain: `${speaker} speaks slowly in a calm, moderate-pitched voice with clear pronunciation. The recording is very high quality with no background noise.`,
  };
  return styles[style] || styles.chant;
};

// लंबा पाठ अर्ध-पंक्तियों में तोड़ना, ताकि मॉडल हर बार छोटा टुकड़ा बनाए
function chunk(text, max = 200) {
  const parts = text.split(/(?<=[।॥])/).map((x) => x.trim()).filter(Boolean);
  const out = []; let cur = '';
  for (const p of parts) {
    if ((cur + ' ' + p).trim().length > max && cur) { out.push(cur); cur = p; } else cur = (cur + ' ' + p).trim();
  }
  if (cur) out.push(cur);
  return out;
}

async function make(job, speaker, style) {
  const desc = describe(speaker, style);
  const pieces = chunk(job.text);
  const bufs = [];
  for (const piece of pieces) bufs.push(await tts(piece, desc));
  return Buffer.concat(bufs);                         // MP3 के टुकड़े जोड़ने पर भी ब्राउज़र में चलते हैं
}

let fails = 0;
const tooManyFails = () => {
  if (++fails < 3) return false;
  console.log('\nलगातार 3 बार विफल। बिना खाते के मुफ़्त GPU की रोज़ की सीमा शायद खत्म हो गई है।');
  console.log('रास्ते: (1) कुछ घंटे या कल फिर चलाइए, यह रुकी जगह से आगे बढ़ता है,');
  console.log('       (2) अपने Hugging Face खाते का मुफ़्त टोकन दीजिए:  HF_TOKEN=hf_... node tools/generate-audio.js ...');
  return true;
};
(async () => {
  const style = opt('style', 'chant');
  const limit = parseInt(opt('limit', '0'), 10) || Infinity;
  if (flag('samples')) {
    const dir = path.join(__dirname, '..', 'public', 'audio-samples'); fs.mkdirSync(dir, { recursive: true });
    const speakers = opt('speakers', 'Aryan,Rohit').split(',');
    const list = [];
    for (const job of jobs.filter((j) => j.sample).slice(0, limit)) {
      for (const sp of speakers) {
        const file = `${sp.toLowerCase()}-${style}-${job.key}.mp3`;
        const full = path.join(dir, file);
        if (!fs.existsSync(full)) {
          process.stdout.write(`बना रहा हूँ: ${sp} / ${job.title} ... `);
          try { fs.writeFileSync(full, await make(job, sp, style)); console.log('ठीक'); fails = 0; } catch (e) { console.log('विफल:', e.message.slice(0, 120)); if (tooManyFails()) break; continue; }
        }
        list.push({ file, speaker: sp, style, title: job.title, text: job.text });
      }
    }
    fs.writeFileSync(path.join(dir, 'samples.json'), JSON.stringify(list, null, 1), 'utf8');
    console.log(`\nनमूने तैयार: ${list.length}। ऐप चलाकर यह पन्ना खोलिए: http://localhost:3000/samples.html`);
    return;
  }
  if (flag('all')) {
    const speaker = opt('speaker', 'Aryan');
    const dir = path.join(__dirname, '..', 'public', 'audio'); fs.mkdirSync(dir, { recursive: true });
    const mf = path.join(dir, 'manifest.json');
    const manifest = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, 'utf8')) : {};
    let done = 0;
    for (const job of jobs) {
      if (done >= limit) break;
      const file = job.key + '.mp3';
      if (fs.existsSync(path.join(dir, file))) { manifest[job.key] = file; continue; }
      process.stdout.write(`[${Object.keys(manifest).length + 1}/${jobs.length}] ${job.title} ... `);
      try {
        fs.writeFileSync(path.join(dir, file), await make(job, speaker, style));
        manifest[job.key] = file; done++;
        fs.writeFileSync(mf, JSON.stringify(manifest, null, 1), 'utf8');
        console.log('ठीक'); fails = 0;
      } catch (e) { console.log('विफल:', e.message.slice(0, 120), '(बाद में फिर चलाइए)'); if (tooManyFails()) break; }
    }
    fs.writeFileSync(mf, JSON.stringify(manifest, null, 1), 'utf8');
    console.log(`\nकुल रिकॉर्डिंग: ${Object.keys(manifest).length}/${jobs.length}`);
    return;
  }
  console.log('उपयोग: node tools/generate-audio.js --samples  |  --all [--speaker NAME] [--limit N]');
})();
