// Google TTS में हिंदी आवाज़ों की सूची: GOOGLE_TTS_API_KEY=... node tools/list-google-voices.js [Chirp3]
// जो नाम यहाँ दिखे उसे GOOGLE_TTS_VOICE में रखिए।
const key = process.env.GOOGLE_TTS_API_KEY;
if (!key) { console.error('पहले GOOGLE_TTS_API_KEY सेट कीजिए'); process.exit(1); }
const filter = process.argv[2] || '';
fetch('https://texttospeech.googleapis.com/v1/voices?languageCode=hi-IN', { headers: { 'x-goog-api-key': key } })
  .then(async (r) => { if (!r.ok) throw new Error(r.status + ' ' + (await r.text()).slice(0, 200)); return r.json(); })
  .then((d) => (d.voices || []).filter((v) => v.name.includes(filter)).forEach((v) => console.log(v.name, '|', v.ssmlGender)))
  .catch((e) => { console.error(String(e.message)); process.exit(1); });
