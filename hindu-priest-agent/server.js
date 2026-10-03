// हिंदू पुजारी एजेंट: बिना किसी बाहरी पैकेज के चलने वाला सर्वर।
// चलाने के लिए: ANTHROPIC_API_KEY सेट करें, फिर `node server.js`
const http = require('http');
const fs = require('fs');
const path = require('path');
const POOJAS = require('./public/poojas.js');

const PORT = process.env.PORT || 3000;
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';
const API_KEY = process.env.ANTHROPIC_API_KEY;

const FALLBACK = 'क्षमा कीजिए यजमान, मैं केवल हिंदू पूजा और प्रार्थना के विषय में ही बात कर सकता हूँ। कृपया बताइए, कौन-सी पूजा करवानी है?';
const NO_KEY = 'क्षमा कीजिए यजमान, सर्वर में एंथ्रोपिक की कुंजी नहीं मिली, इसलिए मैं अभी उत्तर नहीं दे पा रहा हूँ।';

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

## उपलब्ध पूजाएँ (pooja_id और विवरण)
${poojaList}

## पूजा चुनवाने का तरीका
- यजमान पूजा चुन ले तो पहले उसका नाम और गोत्र पूछो (अगर नीचे स्थिति में पहले से नहीं है)। गोत्र पता न हो तो परंपरा के अनुसार "कश्यप" मान लो और बता दो। इस दौरान intent "clarify" और pooja_id भरा रखो।
- नाम और गोत्र मिल जाएँ तो सामग्री एक वाक्य में गिनाओ और intent "start" दो। pooja_id और yajman भरो।
- यजमान तय न कर पाए तो पूजाओं के विकल्प दोहराओ और intent "chat" रखो।

## वर्तमान स्थिति
यजमान का नाम: ${state.yajman?.name || 'अभी पता नहीं'}
यजमान का गोत्र: ${state.yajman?.gotra || 'अभी पता नहीं'}
चुनी हुई या प्रतीक्षित पूजा: ${state.pending || (cur ? cur.id : 'कोई नहीं')}
पूजा की स्थिति: ${state.phase}
${cur && step ? `वर्तमान चरण: ${state.step + 1}/${cur.steps.length} — ${step.title}\nइस चरण का मंत्र: ${step.sloka}\nइस चरण का अर्थ: ${step.meaning}` : ''}
${state.phase === 'interrupted' ? 'यजमान ने पूजा के बीच में टोका है। नियम तीन का पालन करो।' : ''}

## आउटपुट का प्रारूप
केवल एक JSON ऑब्जेक्ट लौटाओ, उसके बाहर कुछ नहीं:
{"understood": "यजमान की बात तुमने क्या समझी, एक छोटा हिंदी वाक्य", "reply": "यजमान को बोले जाने वाला हिंदी उत्तर", "intent": "chat|clarify|start|resume|repeat|next|stop", "pooja_id": "ऊपर की सूची से या null", "yajman": {"name": "या null", "gotra": "या null"}}
intent का अर्थ: chat = सामान्य बातचीत, clarify = स्पष्टीकरण या जानकारी चाहिए, start = पूजा शुरू करो, resume = पूजा जहाँ रुकी थी वहीं से चालू करो (पूजा चल रही या रुकी हो और टोकने का उत्तर पूरा हो गया), repeat = वर्तमान चरण दोबारा, next = अगला चरण, stop = पूजा समाप्त।
"reply" में "understood" की बात दोहराना ज़रूरी नहीं, पर टोकने पर reply का पहला वाक्य यजमान की बात की पुष्टि करे।`;
}

const hasLatin = (s) => /[A-Za-z]/.test(s || '');

async function callClaude(system, messages) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 1024, system, messages }),
  });
  if (!r.ok) throw new Error(`API ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  return (j.content || []).map((b) => b.text || '').join('');
}

function parse(text) {
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b < 0) return null;
  try { return JSON.parse(text.slice(a, b + 1)); } catch { return null; }
}

async function chat({ messages, image, state }) {
  if (!API_KEY) return { reply: NO_KEY, intent: 'chat' };
  const system = systemPrompt(state);
  const msgs = messages.slice(-16).map((m) => ({ role: m.role, content: m.text || '(चित्र)' }));
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  const last = msgs[msgs.length - 1];
  if (!last || last.role !== 'user') return { reply: FALLBACK, intent: 'chat' };
  if (image) {
    last.content = [
      { type: 'image', source: { type: 'base64', media_type: image.media_type, data: image.data } },
      { type: 'text', text: last.content },
    ];
  }
  let convo = msgs;
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await callClaude(system, convo);
    const out = parse(text);
    if (out && out.reply && ![out.reply, out.understood].some(hasLatin)) {
      const ids = POOJAS.map((p) => p.id);
      if (!ids.includes(out.pooja_id)) out.pooja_id = null;
      if (!['chat', 'clarify', 'start', 'resume', 'repeat', 'next', 'stop'].includes(out.intent)) out.intent = 'chat';
      return out;
    }
    convo = [...msgs, { role: 'assistant', content: text }, { role: 'user', content: 'तुमने नियम तोड़ा। केवल देवनागरी हिंदी में, बिना किसी रोमन अक्षर के, वही JSON दोबारा दो।' }];
  }
  return { reply: FALLBACK, intent: 'chat' };
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css' };

http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/chat') {
      let body = '';
      for await (const c of req) { body += c; if (body.length > 12e6) throw new Error('too large'); }
      const out = await chat(JSON.parse(body));
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify(out));
    }
    const file = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : path.normalize(req.url.split('?')[0]).replace(/^(\.\.[/\\])+/, ''));
    if (!file.startsWith(path.join(__dirname, 'public')) || !fs.existsSync(file)) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    console.error(e.message);
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ reply: 'क्षमा कीजिए यजमान, कुछ बाधा आ गई। कृपया दोबारा कहिए।', intent: 'chat' }));
  }
}).listen(PORT, () => console.log(`आचार्य जी तैयार हैं: http://localhost:${PORT}`));
