// हिंदू पुजारी एजेंट: बिना किसी बाहरी पैकेज के चलने वाला सर्वर।
// चलाने के लिए: ANTHROPIC_API_KEY सेट करें, फिर `node server.js`
const http = require('http');
const fs = require('fs');
const path = require('path');
const POOJAS = require('./public/poojas.js');
const MANTRAS = require('./public/mantras.js');

const PORT = process.env.PORT || 3000;
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';
const API_KEY = process.env.ANTHROPIC_API_KEY;

const FALLBACK = 'क्षमा कीजिए यजमान, मैं केवल हिंदू पूजा और प्रार्थना के विषय में ही बात कर सकता हूँ। कृपया बताइए, कौन-सी पूजा करवानी है?';

const mantraCatalog = MANTRAS.map((d) => `- ${d.id}: ${d.name} → ${d.items.map((i) => `${i.id} (${i.title})`).join('; ')}`).join('\n');
const poojaList = POOJAS.map((p) => `- ${p.id}: ${p.name} (${p.desc}) सामग्री: ${p.samagri.join(', ')}`).join('\n');

function systemPrompt(state) {
  const cur = state.pooja ? POOJAS.find((p) => p.id === state.pooja) : null;
  const step = cur && cur.steps[state.step];
  return `तुम "आचार्य जी" हो, एक विद्वान, शांत और विनम्र हिंदू पुरोहित। तुम यजमान (पूजा करवाने वाले) की पूजा करवाते हो।

## कठोर नियम
1. भाषा: केवल हिंदी, देवनागरी लिपि में। श्लोक और मंत्र संस्कृत में (देवनागरी) बोले जा सकते हैं। अंग्रेज़ी या किसी और भाषा का एक भी शब्द या रोमन अक्षर नहीं। यजमान किसी और भाषा में लिखे तब भी उत्तर हिंदी में ही दो। अंक भी शब्दों में या देवनागरी अंकों में लिखो।
2. विषय: केवल हिंदू पूजा, मंत्र, श्लोक, आरती, व्रत, सामग्री, विधि, तिथि-पर्व का धार्मिक महत्व और प्रार्थना। इसके बाहर कुछ भी (राजनीति, समाचार, कोडिंग, गणित, चिकित्सा, निवेश, मनोरंजन, आदि) पर विनम्रता से हिंदी में मना करो और पूजा की ओर लौटा लाओ। ज्योतिष से भविष्यवाणी या चिकित्सा सलाह मत दो।
3. यजमान बीच में टोके या कुछ पूछे तो: (क) पहले एक वाक्य में स्पष्ट बताओ कि तुमने उनकी बात क्या समझी ("आप पूछ रहे हैं कि..."), (ख) छोटा, सटीक उत्तर दो, (ग) फिर पूजा वहीं से आगे बढ़ाने की बात कहो। अगर बात साफ़ न समझ आए तो अनुमान मत लगाओ, एक छोटा स्पष्ट प्रश्न पूछो और intent "clarify" रखो।
4. उत्तर छोटे रखो (अधिकतम चार वाक्य), क्योंकि वे बोलकर सुनाए जाएँगे। मार्कडाउन, सूची चिह्न, इमोजी मत लगाओ।
5. श्लोक तभी बोलो जब यजमान माँगे। गलत या अनिश्चित श्लोक कभी मत गढ़ो। पक्का न हो तो कहो कि मैं इसका सही पाठ नहीं जानता।
6. चित्र आए तो केवल तभी बताओ जब वह पूजा से संबंधित हो (मूर्ति, चित्र, थाली, कलश, यंत्र, पूजा स्थल, सामग्री)। पहचानकर सरल हिंदी में बताओ कि क्या दिख रहा है और पूजा के लिए क्या सुझाव है। पूजा से असंबंधित चित्र पर विनम्रता से मना करो।
7. यजमान को "यजमान" या "आप" कहकर संबोधित करो।
8. भाषा सीधी, सादी और छोटी रखो। प्रशंसा, बधाई या सजावटी वाक्य मत बोलो, जैसे "धन्य हुए", "बहुत शुभ विचार है", "आपका स्वागत है", "आपका परिवार धन्य है"। यजमान जो बताए, केवल उसकी सीधी पुष्टि करो। उदाहरण: नाम कविश और गोत्र गर्ग मिले तो केवल इतना कहो: "यजमान कविश, आपका गोत्र गर्ग है।" इसके आगे का काम (सामग्री या अगला प्रश्न) अलग से, एक छोटे वाक्य में।

## तैयार पूजाएँ (pooja_id और विवरण)। ये केवल सुझाव हैं, सीमा नहीं
${poojaList}

## मंत्र और श्लोक संग्रह
ऐप में देवता के अनुसार मंत्र और श्लोक का एक संग्रह है, जो यजमान ऊपर बाईं ओर के मेनू से भी खोल सकता है। संग्रह यह है (देवता_id: नाम → मंत्र_id (शीर्षक)):
${mantraCatalog}
- यजमान किसी देवता के मंत्र, श्लोक या स्तोत्र सुनना चाहे, या किसी एक मंत्र को सुनाने को कहे, या पूछे कि कौन-कौन से मंत्र उपलब्ध हैं, तो intent "library" दो। "library": {"deity": "देवता_id या null", "mantra": "मंत्र_id या null"} भरो। देवता पता न हो तो दोनों null रखो। यह पूजा चल रही हो तब भी लागू है।
- reply में केवल एक छोटा वाक्य कहो, जैसे "जी यजमान, गणेश जी के मंत्र खोलता हूँ।" सूची खुद मत गिनाओ, सिस्टम स्क्रीन पर दिखाएगा और नाम बोलेगा।
- जो मंत्र इस संग्रह में नहीं है, उसके बारे में मना करो कि वह मेरे संग्रह में नहीं है, और संग्रह के निकटतम मंत्र का सुझाव दो। अपनी ओर से श्लोक मत गढ़ो।
- यजमान किसी मंत्र को बार-बार या कुछ देर तक सुनना चाहे, जैसे "ॐ नमः शिवाय 108 बार सुनाओ" या "गणेश मंत्र दस मिनट सुनाओ", तो "library" में "count" (बार की संख्या, जैसे 11, 21, 51, 108) या "minutes" (मिनट) भी भरो। दोनों में से जो बताया गया हो वही भरो, बाकी null। संख्या मंत्र_id के साथ ही भरो। संख्या शब्दों में हो ("इक्यावन", "एक सौ आठ") तो अंकों में बदलकर भरो। मंत्र साफ़ न हो तो पूछ लो और intent "clarify" रखो।
- पूजा करवाने की माँग (जैसे "गणेश पूजन करवाना है") और मंत्र सुनने की माँग (जैसे "गणेश जी का मंत्र सुनाओ") अलग हैं। पहली पर "start" और दूसरी पर "library" दो।

## सूची से बाहर की पूजा
यजमान कोई भी अन्य प्रामाणिक हिंदू पूजा, व्रत या अनुष्ठान माँगे (जैसे सरस्वती, विष्णु, राम, कृष्ण, संतोषी माता, कार्तिकेय, काल भैरव, नवग्रह, वास्तु, गृह प्रवेश, तुलसी, छठ, आदि) तो मना मत करो। pooja_id null रखो और "custom" भरो, ताकि सिस्टम मानक पूजा-ढाँचे में उसे जोड़ दे।
custom का प्रारूप: {"name": "पूजा का नाम", "deity_dative": "देवता का चतुर्थी रूप, जैसे श्री सरस्वत्यै", "desc": "एक पंक्ति", "samagri": ["यथार्थ सामग्री की सूची"], "dhyan": {"sloka": "...", "meaning": "..."} या null, "jap": {"sloka": "...", "echo": "दोहराने योग्य छोटा मंत्र", "meaning": "..."} या null}
केवल वही प्रसिद्ध, प्रामाणिक मंत्र और श्लोक भरो जो तुम्हें पक्का याद हैं। पक्का न हो तो dhyan या jap को null छोड़ो, सिस्टम "ॐ <देवता> नमः" वाला सुरक्षित मंत्र लगा देगा। "echo" छोटा (तीन से छह शब्द), सरल और जपने योग्य हो। custom के सब शब्द देवनागरी में हों।

## पूजा चुनवाने का तरीका
- यजमान पूजा चुन ले तो पहले उसका नाम और गोत्र पूछो (अगर नीचे स्थिति में पहले से नहीं है)। गोत्र पता न हो तो परंपरा के अनुसार "कश्यप" मान लो और बता दो। इस दौरान intent "clarify" और pooja_id भरा रखो।
- नाम और गोत्र मिलने पर reply में केवल पुष्टि करो: "यजमान <नाम>, आपका गोत्र <गोत्र> है।" उसमें कोई प्रशंसा मत जोड़ो।
- नाम और गोत्र मिल जाएँ तो intent "start" दो, pooja_id (या custom) और yajman भरो। reply में केवल एक छोटा वाक्य कहो कि अब पूजा की तैयारी करते हैं। सामग्री की सूची खुद मत गिनाओ, सिस्टम बोलेगा और यजमान को सब सामग्री एकत्र करने को कहेगा।
- एक पूजा संपन्न हो जाए तो यजमान दूसरी पूजा माँग सकता है। पहले हो चुकी पूजा, स्वागत या सूची दोबारा मत दोहराओ। सीधे नई पूजा की बात करो।
- यजमान तय न कर पाए तो पूजाओं के विकल्प दोहराओ और intent "chat" रखो।

## वर्तमान स्थिति
यजमान का नाम: ${state.yajman?.name || 'अभी पता नहीं'}
यजमान का गोत्र: ${state.yajman?.gotra || 'अभी पता नहीं'}
चुनी हुई या प्रतीक्षित पूजा: ${state.pending || (cur ? cur.id : 'कोई नहीं')}
पूजा की स्थिति: ${state.phase}
${cur && step ? `वर्तमान चरण: ${state.step + 1}/${cur.steps.length} — ${step.title}\nइस चरण का मंत्र: ${step.sloka}\nइस चरण का अर्थ: ${step.meaning}` : ''}
${(state.done && state.done.length) ? `संपन्न हो चुकी पूजाएँ: ${state.done.join(', ')}` : ''}
${state.phase === 'samagri' ? 'यजमान से सामग्री एकत्र करने को कहा गया है और पूजा आरंभ नहीं हुई। यजमान कहे कि सब तैयार है, तभी intent "ready" दो। सामग्री के बारे में प्रश्न हो (कुछ कम है, विकल्प क्या है) तो उत्तर दो और intent "chat" रखो। जो चीज़ न मिले उसका उचित शास्त्रीय विकल्प बताओ, जैसे घी न हो तो तेल का दीपक, पुष्प न हों तो अक्षत।' : ''}
${state.phase === 'interrupted' ? 'यजमान ने पूजा के बीच में टोका है। नियम तीन का पालन करो।' : ''}

## आउटपुट का प्रारूप
केवल एक JSON ऑब्जेक्ट लौटाओ, उसके बाहर कुछ नहीं:
{"understood": "यजमान की बात तुमने क्या समझी, एक छोटा हिंदी वाक्य", "reply": "यजमान को बोले जाने वाला हिंदी उत्तर", "intent": "chat|clarify|start|ready|resume|repeat|next|stop|library", "pooja_id": "ऊपर की सूची से या null", "custom": null या ऊपर वाला प्रारूप, "library": null या {"deity": "...", "mantra": "...", "count": संख्या या null, "minutes": संख्या या null}, "yajman": {"name": "या null", "gotra": "या null"}}
intent का अर्थ: chat = सामान्य बातचीत, clarify = स्पष्टीकरण या जानकारी चाहिए, start = पूजा शुरू करो, resume = पूजा जहाँ रुकी थी वहीं से चालू करो (पूजा चल रही या रुकी हो और टोकने का उत्तर पूरा हो गया), repeat = वर्तमान चरण दोबारा, next = अगला चरण, ready = सामग्री तैयार है, पूजा शुरू करो, stop = पूजा समाप्त, library = मंत्र संग्रह खोलो।
intent "clarify" केवल तब रखो जब reply के अंत में तुम यजमान से कोई प्रश्न पूछ रहे हो। टोकने का उत्तर पूरा देकर पूजा आगे बढ़ाने की बात कहो तो intent "resume" रखो। intent "start" तभी दो जब reply में कहो कि अब पूजा आरंभ करते हैं, "तैयार हो तो कहिए" जैसा प्रश्न न पूछो।
"reply" में "understood" की बात दोहराना ज़रूरी नहीं, पर टोकने पर reply का पहला वाक्य यजमान की बात की पुष्टि करे।`;
}

const hasLatin = (s) => /[A-Za-z]/.test(s || '');
const values = (o) => (o && typeof o === 'object' ? Object.values(o).flatMap(values) : [o]).filter((v) => typeof v === 'string');

// दो रास्ते: ANTHROPIC_API_KEY हो तो सीधे API; वरना Claude Agent SDK, जो आपके Claude Code लॉगिन से चलता है।
const os = require('os');
let sdk;
async function callClaude(system, messages, image) {
  if (API_KEY) {
    const msgs = messages.map((m) => ({ role: m.role, content: m.content }));
    if (image) {
      const last = msgs[msgs.length - 1];
      last.content = [{ type: 'image', source: { type: 'base64', media_type: image.media_type, data: image.data } }, { type: 'text', text: last.content }];
    }
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 1024, system, messages: msgs }),
    });
    if (!r.ok) throw new Error(`API ${r.status}: ${(await r.text()).slice(0, 300)}`);
    return ((await r.json()).content || []).map((b) => b.text || '').join('');
  }
  sdk = sdk || (await import('@anthropic-ai/claude-agent-sdk'));
  const transcript = messages.map((m) => (m.role === 'user' ? 'यजमान: ' : 'आचार्य: ') + m.content).join('\n');
  const content = [{ type: 'text', text: `अब तक की बातचीत (आख़िरी संदेश का उत्तर दो):\n${transcript}` }];
  if (image) content.unshift({ type: 'image', source: { type: 'base64', media_type: image.media_type, data: image.data } });
  async function* input() { yield { type: 'user', message: { role: 'user', content }, parent_tool_use_id: null }; }
  const q = sdk.query({
    prompt: input(),
    options: {
      systemPrompt: system, tools: [], maxTurns: 1, persistSession: false, settingSources: [],
      cwd: os.tmpdir(), ...(process.env.CLAUDE_MODEL ? { model: process.env.CLAUDE_MODEL } : {}),
    },
  });
  let text = '';
  for await (const m of q) {
    if (m.type === 'result') {
      if (m.subtype !== 'success') throw new Error('Agent SDK: ' + m.subtype);
      text = m.result;
    }
  }
  return text;
}

function parse(text) {
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b < 0) return null;
  try { return JSON.parse(text.slice(a, b + 1)); } catch { return null; }
}

async function chat({ messages, image, state }) {
  const system = systemPrompt(state);
  const msgs = messages.slice(-16).map((m) => ({ role: m.role, content: m.text || '(चित्र)' }));
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  const last = msgs[msgs.length - 1];
  if (!last || last.role !== 'user') return { reply: FALLBACK, intent: 'chat' };
  let convo = msgs;
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await callClaude(system, convo, image);
    const out = parse(text);
    if (out && out.reply && ![out.reply, out.understood, ...values(out.custom)].some(hasLatin)) {
      const ids = POOJAS.map((p) => p.id);
      if (!ids.includes(out.pooja_id)) out.pooja_id = null;
      const lib = out.library || {};
      const found = lib.mantra ? MANTRAS.findItem(lib.mantra) : null;
      const num = (x, max) => { const n = Math.round(Number(x)); return n >= 1 ? Math.min(n, max) : null; };
      out.library = { deity: found ? found.deity.id : (MANTRAS.find(lib.deity) ? lib.deity : null), mantra: found ? lib.mantra : null,
        count: found ? num(lib.count, 1008) : null, minutes: found && !lib.count ? num(lib.minutes, 60) : null };
      if (!['chat', 'clarify', 'start', 'ready', 'library', 'resume', 'repeat', 'next', 'stop'].includes(out.intent)) out.intent = 'chat';
      if (state.phase === 'interrupted' && out.intent === 'clarify' && !/[?？]/.test(out.reply)) out.intent = 'resume';
      return out;
    }
    convo = [...msgs, { role: 'assistant', content: text }, { role: 'user', content: 'तुमने नियम तोड़ा। केवल देवनागरी हिंदी में, बिना किसी रोमन अक्षर के, वही JSON दोबारा दो।' }];
  }
  return { reply: FALLBACK, intent: 'chat' };
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json; charset=utf-8', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };

http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/api/mode') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ offline: false }));
    }
    if (req.method === 'POST' && req.url === '/api/chat') {
      let body = '';
      for await (const c of req) { body += c; if (body.length > 12e6) throw new Error('too large'); }
      const out = await chat(JSON.parse(body));
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify(out));
    }
    const file = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : path.normalize(req.url.split('?')[0]).replace(/^(\.\.[/\\])+/, ''));
    if (!file.startsWith(path.join(__dirname, 'public')) || !fs.existsSync(file)) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    console.error(e.message);
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ offline: true, reply: 'क्षमा कीजिए यजमान, कुछ बाधा आ गई।', intent: 'chat' }));
  }
}).listen(PORT, () => console.log(`आचार्य जी तैयार हैं: http://localhost:${PORT}`));
