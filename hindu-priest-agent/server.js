// हिंदू पुजारी एजेंट: बिना किसी बाहरी पैकेज के चलने वाला सर्वर।
// चलाने के लिए: ANTHROPIC_API_KEY सेट करें, फिर `node server.js`
const http = require('http');
const fs = require('fs');
const path = require('path');
const POOJAS = require('./public/poojas.js');
const MANTRAS = require('./public/mantras.js');
const RAG = require('./public/rag.js');
const AUDIOKEY = require('./public/audiokey.js');

// हॉस्टेड आवाज़ (वैकल्पिक): आचार्य जी की बोली इससे बनती है। कुंजी केवल पर्यावरण-चर में रखें, कोड या चैट में नहीं।
//   Google:      GOOGLE_TTS_API_KEY (और चाहें तो GOOGLE_TTS_VOICE, जैसे hi-IN-Chirp3-HD-Charon)
//   ElevenLabs:  ELEVENLABS_API_KEY और ELEVENLABS_VOICE_ID
// दोनों हों तो Google चलती है। कुछ न हो, या कॉल विफल हो, तो ब्राउज़र की आवाज़ चलती है।
const TTS = process.env.GOOGLE_TTS_API_KEY
  ? { name: 'google', key: process.env.GOOGLE_TTS_API_KEY, voice: process.env.GOOGLE_TTS_VOICE || 'hi-IN-Chirp3-HD-Charon', model: '' }
  : { name: 'elevenlabs', key: process.env.ELEVENLABS_API_KEY || '', voice: process.env.ELEVENLABS_VOICE_ID || '', model: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2' };
const ttsEnabled = () => !!(TTS.key && TTS.voice);
const TTS_DIR = path.join(__dirname, '.tts-cache');
const ttsInflight = new Map();
async function ttsFetch(text) {
  if (TTS.name === 'google') {
    const r = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
      method: 'POST', headers: { 'x-goog-api-key': TTS.key, 'content-type': 'application/json' },
      body: JSON.stringify({ input: { text }, voice: { languageCode: 'hi-IN', name: TTS.voice }, audioConfig: { audioEncoding: 'MP3' } }),
    });
    if (!r.ok) throw new Error('Google TTS ' + r.status + ' ' + (await r.text()).slice(0, 200));
    return Buffer.from((await r.json()).audioContent, 'base64');
  }
  const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(TTS.voice) + '?output_format=mp3_44100_64', {
    method: 'POST', headers: { 'xi-api-key': TTS.key, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: TTS.model, language_code: 'hi' }),
  });
  if (!r.ok) throw new Error('ElevenLabs ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return Buffer.from(await r.arrayBuffer());
}
async function ttsAudio(text) {
  const file = path.join(TTS_DIR, AUDIOKEY.key(TTS.name + '|' + TTS.voice + '|' + TTS.model + '|' + text) + '.mp3');
  if (fs.existsSync(file)) return fs.readFileSync(file);
  if (!ttsInflight.has(file)) {
    ttsInflight.set(file, (async () => {
      const buf = await ttsFetch(text);
      fs.mkdirSync(TTS_DIR, { recursive: true }); fs.writeFileSync(file, buf);
      return buf;
    })().finally(() => ttsInflight.delete(file)));
  }
  return ttsInflight.get(file);
}
// लक्ष्मी पूजन का ज्ञान-आधार (PDF)। न मिले तो यह सुविधा बंद रहती है।
let LKB = null; try { LKB = require('./public/knowledge/lakshmi.js'); } catch (e) { LKB = null; }
const kbChunks = (kb) => [
  { id: 'intro', page: 1, title: 'भूमिका: पूजा का समय और फल', text: kb.intro },
  { id: 'samagri', page: 1, title: 'पूजन के लिए ज़रूरी सामग्री', text: kb.samagri.join(', ') },
  ...kb.steps.map((st, i) => ({ id: 'step' + (i + 1), page: st.page, step: i + 1, title: st.title, text: [st.instruction, st.sloka].filter(Boolean).join(' ') })),
];
const lakshmiChunks = LKB ? kbChunks(LKB) : [];
const lakshmiIndex = LKB ? RAG.build(lakshmiChunks) : null;
const lakshmiOverview = LKB ? LKB.steps.map((st, i) => (i + 1) + '. ' + st.title).join('; ') : '';

const PORT = process.env.PORT || 3000;
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';
const API_KEY = process.env.ANTHROPIC_API_KEY;

const FALLBACK = 'क्षमा कीजिए यजमान, मैं केवल हिंदू पूजा और प्रार्थना के विषय में ही बात कर सकता हूँ। कृपया बताइए, कौन-सी पूजा करवानी है?';

const mantraCatalog = MANTRAS.map((d) => `- ${d.id}: ${d.name} → ${d.items.map((i) => `${i.id} (${i.title})`).join('; ')}`).join('\n');
const poojaList = POOJAS.map((p) => `- ${p.id}: ${p.name} (${p.desc}) सामग्री: ${p.samagri.join(', ')}`).join('\n');

// यह निर्देश कभी नहीं बदलता, इसलिए Claude की प्रक्रिया पहले से तैयार रखी जा सकती है। बदलती स्थिति यजमान के संदेश के साथ जाती है।
const STATIC_SYSTEM = `तुम "आचार्य जी" हो, एक विद्वान, शांत और विनम्र हिंदू पुरोहित। तुम यजमान (पूजा करवाने वाले) की पूजा करवाते हो।

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
- जो मंत्र इस संग्रह में नहीं है, उसके बारे में मना करो कि वह मेरे संग्रह में नहीं है, और संग्रह के निकटतम मंत्र का सुझाव दो (यह सुझाव लक्ष्मी पूजन चलते समय मत दो)। अपनी ओर से श्लोक मत गढ़ो।
- यजमान किसी मंत्र को बार-बार या कुछ देर तक सुनना चाहे, जैसे "ॐ नमः शिवाय 108 बार सुनाओ" या "गणेश मंत्र दस मिनट सुनाओ", तो "library" में "count" (बार की संख्या, जैसे 11, 21, 51, 108) या "minutes" (मिनट) भी भरो। दोनों में से जो बताया गया हो वही भरो, बाकी null। संख्या मंत्र_id के साथ ही भरो। संख्या शब्दों में हो ("इक्यावन", "एक सौ आठ") तो अंकों में बदलकर भरो। मंत्र साफ़ न हो तो पूछ लो और intent "clarify" रखो।
- पूजा करवाने की माँग (जैसे "गणेश पूजन करवाना है") और मंत्र सुनने की माँग (जैसे "गणेश जी का मंत्र सुनाओ") अलग हैं। पहली पर "start" और दूसरी पर "library" दो।

## दस्तावेज़-आधारित लक्ष्मी पूजन (pooja_id: lakshmi)
लक्ष्मी पूजन (दीपावली पूजन) केवल एक दिए गए दस्तावेज़ (PDF) की विधि से होता है। जब यजमान लक्ष्मी या दीपावली पूजन के बारे में कुछ पूछे, या वह पूजा चल रही हो, तब संदेश के साथ "दस्तावेज़ के अंश" और पूजा का पूरा क्रम दिया जाएगा। इन नियमों का पालन करो:
- लक्ष्मी पूजन की कोई भी विधि, क्रम, सामग्री, मंत्र या निर्देश केवल दिए गए अंशों से बताओ। अपनी याददाश्त या सामान्य ज्ञान से कुछ मत जोड़ो, मत बदलो और क्रम मत बदलो।
- जो बात दिए गए अंशों में नहीं है, उसके बारे में केवल इतना कहो: "यह पूजा-विधि के दस्तावेज़ में नहीं दिया गया है।" कोई अनुमान, सुझाव या विकल्प मत दो।
- दस्तावेज़ में मंत्रों के अर्थ नहीं दिए गए हैं। अर्थ पूछने पर यही बताओ कि दस्तावेज़ में अर्थ नहीं दिया गया है।
- लक्ष्मी पूजन चुने जाने पर यजमान का नाम, गोत्र और अपने नगर या गाँव का नाम पूछो, क्योंकि दस्तावेज़ के संकल्प में तीनों माँगे गए हैं। तीनों मिलने पर ही intent "start" दो। "yajman" में "place" भी भरो।
- "दीपावली पूजा", "दिवाली पूजन", "लक्ष्मी-गणेश पूजन" सब का अर्थ pooja_id "lakshmi" है।
- लक्ष्मी पूजन के दौरान दस्तावेज़ से बाहर की कोई चीज़ मत सुझाओ: न मंत्र संग्रह का कोई मंत्र या आरती, न कोई दूसरा मंत्र, पाठ, विकल्प या सलाह। जैसे आरती या श्री सूक्त का पाठ दस्तावेज़ में न हो तो केवल कहो कि दस्तावेज़ में नहीं दिया गया है। यजमान खुद मंत्र संग्रह खोलने या किसी मंत्र को सुनाने को कहे, तभी intent "library" दो।

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

## आउटपुट का प्रारूप
केवल एक JSON ऑब्जेक्ट लौटाओ, उसके बाहर कुछ नहीं:
{"reply": "यजमान को बोले जाने वाला हिंदी उत्तर", "intent": "chat|clarify|start|ready|resume|repeat|next|stop|library", "pooja_id": "ऊपर की सूची से या null", "custom": null या ऊपर वाला प्रारूप, "library": null या {"deity": "...", "mantra": "...", "count": संख्या या null, "minutes": संख्या या null}, "yajman": {"name": "या null", "gotra": "या null", "place": "नगर या गाँव, या null"}}
intent का अर्थ: chat = सामान्य बातचीत, clarify = स्पष्टीकरण या जानकारी चाहिए, start = पूजा शुरू करो, resume = पूजा जहाँ रुकी थी वहीं से चालू करो (पूजा चल रही या रुकी हो और टोकने का उत्तर पूरा हो गया), repeat = वर्तमान चरण दोबारा, next = अगला चरण, ready = सामग्री तैयार है, पूजा शुरू करो, stop = पूजा समाप्त, library = मंत्र संग्रह खोलो।
intent "clarify" केवल तब रखो जब reply के अंत में तुम यजमान से कोई प्रश्न पूछ रहे हो। टोकने का उत्तर पूरा देकर पूजा आगे बढ़ाने की बात कहो तो intent "resume" रखो। intent "start" तभी दो जब reply में कहो कि अब पूजा आरंभ करते हैं, "तैयार हो तो कहिए" जैसा प्रश्न न पूछो।
टोकने पर reply का पहला वाक्य यजमान की बात की पुष्टि करे।`;

function stateText(state) {
  const cur = state.pooja ? POOJAS.find((p) => p.id === state.pooja) : null;
  const step = cur && cur.steps[state.step];
  return `## वर्तमान स्थिति
यजमान का नाम: ${state.yajman?.name || 'अभी पता नहीं'}
यजमान का गोत्र: ${state.yajman?.gotra || 'अभी पता नहीं'}
यजमान का नगर या गाँव: ${state.yajman?.place || 'अभी पता नहीं'}
चुनी हुई या प्रतीक्षित पूजा: ${state.pending || (cur ? cur.id : 'कोई नहीं')}
पूजा की स्थिति: ${state.phase}
${cur && step ? `वर्तमान चरण: ${state.step + 1}/${cur.steps.length} — ${step.title}\nइस चरण का मंत्र: ${step.sloka}\n${step.meaning ? '\nइस चरण का अर्थ: ' + step.meaning : ''}` : ''}
${(state.done && state.done.length) ? `संपन्न हो चुकी पूजाएँ: ${state.done.join(', ')}` : ''}
${state.phase === 'samagri' ? 'यजमान से सामग्री एकत्र करने को कहा गया है और पूजा आरंभ नहीं हुई। यजमान कहे कि सब तैयार है, तभी intent "ready" दो। सामग्री के बारे में प्रश्न हो (कुछ कम है, विकल्प क्या है) तो उत्तर दो और intent "chat" रखो। जो चीज़ न मिले उसका उचित शास्त्रीय विकल्प बताओ, जैसे घी न हो तो तेल का दीपक, पुष्प न हों तो अक्षत।' : ''}
${state.phase === 'interrupted' ? 'यजमान ने पूजा के बीच में टोका है। नियम तीन का पालन करो।' : ''}`;
}

const hasLatin = (s) => /[A-Za-z]/.test(s || '');
const values = (o) => (o && typeof o === 'object' ? Object.values(o).flatMap(values) : [o]).filter((v) => typeof v === 'string');

// दो रास्ते: ANTHROPIC_API_KEY हो तो सीधे API; वरना Claude Agent SDK, जो आपके Claude Code लॉगिन से चलता है।
const os = require('os');
let sdk;
// Agent SDK के विकल्प: सोचना बंद और कम मेहनत (जवाब जल्दी आए), और तेज़ मॉडल। CLAUDE_MODEL से बदला जा सकता है।
const sdkOptions = (system) => ({
  systemPrompt: system, tools: [], maxTurns: 1, persistSession: false, settingSources: [], cwd: os.tmpdir(),
  thinking: { type: 'disabled' }, effort: 'low', model: process.env.CLAUDE_MODEL || 'sonnet',
});
// हर संदेश पर Claude को नए सिरे से शुरू करने में कई सेकंड जाते हैं। इसलिए अगली प्रक्रिया पहले से तैयार रखते हैं।
let warmP = null;
const spawnWarm = () => { warmP = sdk.startup({ options: sdkOptions(STATIC_SYSTEM) }).catch(() => null); };
async function openQuery(options, prompt) {
  let w = null;
  if (warmP) { w = await warmP; warmP = null; }
  spawnWarm();
  if (w) { try { return w.query(prompt); } catch (e) { /* तैयार प्रक्रिया नहीं चली: नीचे सीधे चलाएँगे */ } }
  return sdk.query({ prompt, options });
}
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
  const q = await openQuery(sdkOptions(system), input());
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
  const system = STATIC_SYSTEM;
  const msgs = messages.slice(-16).map((m) => ({ role: m.role, content: m.text || '(चित्र)' }));
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  const last = msgs[msgs.length - 1];
  if (!last || last.role !== 'user') return { reply: FALLBACK, intent: 'chat' };
  const userText = last.content;
  last.content = stateText(state) + '\n\nयजमान का नया संदेश: ' + last.content;
  // लक्ष्मी पूजन: दस्तावेज़ में खोजकर सबसे संबंधित अंश संदेश के साथ देना (RAG)
  if (lakshmiIndex && (state.pooja === 'lakshmi' || state.pending === 'lakshmi' || /लक्ष्मी|दिवाली|दीवाली|दीपावली/.test(userText))) {
    const cur = state.pooja === 'lakshmi' && LKB.steps[state.step] ? { n: state.step + 1, st: LKB.steps[state.step] } : null;
    const hits = RAG.search(lakshmiIndex, userText + (cur ? ' ' + cur.st.title : ''), 4).map((h) => h.chunk);
    if (cur && !hits.some((c) => c.step === cur.n)) hits.unshift(lakshmiChunks.find((c) => c.step === cur.n));   // चल रहा चरण हमेशा
    const ctx = hits.filter(Boolean).map((c) => `[पृष्ठ ${c.page}: ${c.title}] ${c.text}`).join('\n');
    last.content = '## दस्तावेज़ के अंश (केवल इन्हीं के आधार पर लक्ष्मी पूजन की बात बताओ)\n' + (ctx || '(इस प्रश्न से मेल खाता कोई अंश नहीं मिला)')
      + '\n\n## पूजा का पूरा क्रम (दस्तावेज़ के अनुसार)\n' + lakshmiOverview + '\n\n' + last.content;
  }
  let convo = msgs;
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await callClaude(system, convo, image);
    const out = parse(text);
    if (out && out.reply && ![out.reply, ...values(out.custom)].some(hasLatin)) {
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
    if (req.method === 'GET' && req.url === '/api/tts-mode') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ enabled: ttsEnabled() }));
    }
    if (req.method === 'GET' && req.url === '/api/tts-check') {         // ब्राउज़र में खोलकर परखने के लिए: हॉस्टेड आवाज़ चल रही है या क्यों नहीं
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      if (!ttsEnabled()) return res.end('बंद है: ' + (TTS.name === 'google' ? 'GOOGLE_TTS_VOICE' : 'ELEVENLABS_API_KEY और ELEVENLABS_VOICE_ID') + ' सर्वर को नहीं मिले। उसी विंडो में सेट करके node server.js चलाइए।');
      try { const buf = await ttsFetch('नमस्ते।'); return res.end(`ठीक है ✅ ${TTS.name} (${TTS.voice}) से ${buf.length} बाइट की आवाज़ बनी।`); }
      catch (e) { return res.end('विफल ❌ ' + TTS.name + ' (' + TTS.voice + ')\n\n' + String(e.message).slice(0, 600)); }
    }
    if (req.method === 'POST' && req.url === '/api/tts') {
      if (!ttsEnabled()) { res.writeHead(503); return res.end('tts not configured'); }
      let body = '';
      for await (const c of req) { body += c; if (body.length > 5000) throw new Error('too large'); }
      const text = String(JSON.parse(body).text || '').trim();
      if (!text || text.length > 800) { res.writeHead(400); return res.end('bad text'); }
      try {
        const buf = await ttsAudio(text);
        res.writeHead(200, { 'content-type': 'audio/mpeg', 'content-length': buf.length, 'cache-control': 'private, max-age=86400' });
        return res.end(buf);
      } catch (e) { const msg = String(e.message).slice(0, 300); console.error(msg); res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' }); return res.end(msg); }
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
    const size = fs.statSync(file).size, type = MIME[path.extname(file)] || 'application/octet-stream';
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (m) {                                         // ऑडियो के टुकड़े माँगने पर (ठहराव बराबर करने के लिए आगे-पीछे जाना)
      const a = m[1] === '' ? size - parseInt(m[2], 10) : parseInt(m[1], 10);
      const b = m[1] === '' || m[2] === '' ? size - 1 : Math.min(parseInt(m[2], 10), size - 1);
      if (!(a >= 0 && a <= b && a < size)) { res.writeHead(416, { 'content-range': 'bytes */' + size }); return res.end(); }
      res.writeHead(206, { 'content-type': type, 'cache-control': 'no-store', 'accept-ranges': 'bytes', 'content-range': `bytes ${a}-${b}/${size}`, 'content-length': b - a + 1 });
      return fs.createReadStream(file, { start: a, end: b }).pipe(res);
    }
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store', 'accept-ranges': 'bytes', 'content-length': size });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    console.error(e.message);
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ offline: true, reply: 'क्षमा कीजिए यजमान, कुछ बाधा आ गई।', intent: 'chat' }));
  }
}).listen(PORT, () => {
  if (!API_KEY) import('@anthropic-ai/claude-agent-sdk').then((m) => { sdk = m; spawnWarm(); }).catch(() => {});
  console.log(`आचार्य जी तैयार हैं: http://localhost:${PORT}`);
});
