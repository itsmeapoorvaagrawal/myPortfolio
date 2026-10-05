// Hugging Face Space "ai4bharat/indic-parler-tts" को Gradio API से बुलाने वाला छोटा सहायक।
// बिना किसी खाते या कुंजी के चलता है, पर मुफ़्त GPU की रोज़ की सीमा होती है, इसलिए ज़्यादा बनाने पर रुकना पड़ सकता है।
const HOST = 'https://ai4bharat-indic-parler-tts.hf.space';
const API = '/gradio_api/call/generate_finetuned';
// टोकन कमांड-लाइन में पर्यावरण-चर से दीजिए (कोड या चैट में कभी नहीं लिखिए): HF_TOKEN=hf_... node tools/generate-audio.js ...
const AUTH = process.env.HF_TOKEN ? { authorization: 'Bearer ' + process.env.HF_TOKEN } : {};

async function tts(text, description, { retries = 3 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const r = await fetch(HOST + API, { method: 'POST', headers: { 'content-type': 'application/json', ...AUTH }, body: JSON.stringify({ data: [text, description] }) });
      if (!r.ok) throw new Error('POST ' + r.status + ' ' + (await r.text()).slice(0, 200));
      const { event_id } = await r.json();
      const s = await fetch(HOST + API + '/' + event_id, { headers: AUTH });
      const body = await s.text();
      let ev = null, result = null, err = null;
      for (const line of body.split('\n')) {
        if (line.startsWith('event:')) ev = line.slice(6).trim();
        else if (line.startsWith('data:')) {
          if (ev === 'complete') result = JSON.parse(line.slice(5));
          else if (ev === 'error') err = line.slice(5).trim();
        }
      }
      if (!result) throw new Error('Space error: ' + (err || body.slice(0, 200)));
      const f = result[0];
      const url = HOST + '/gradio_api/file=' + f.path;   // जवाब का f.url बिगड़ा हुआ आता है, इसलिए पता खुद बनाते हैं
      const a = await fetch(url, { headers: AUTH });
      if (!a.ok) throw new Error('download ' + a.status);
      return Buffer.from(await a.arrayBuffer());
    } catch (e) {
      lastErr = e;
      await new Promise((res) => setTimeout(res, 4000 * (attempt + 1)));
    }
  }
  throw lastErr;
}
module.exports = { tts, HOST };
