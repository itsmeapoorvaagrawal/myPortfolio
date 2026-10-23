// लक्ष्मी पूजन के ज्ञान-आधार (PDF) में खोज को खुद परखने के लिए।
//   node tools/rag-search.js "कलश में क्या रखें"
// दिखाता है कि प्रश्न पर कौन-से अंश, किस अंक के साथ, आचार्य जी को दिए जाएँगे।
const RAG = require('../public/rag.js');
const KB = require('../public/knowledge/lakshmi.js');
const chunks = [
  { id: 'intro', page: 1, title: 'भूमिका: पूजा का समय और फल', text: KB.intro },
  { id: 'samagri', page: 1, title: 'पूजन के लिए ज़रूरी सामग्री', text: KB.samagri.join(', ') },
  ...KB.steps.map((st, i) => ({ id: 'step' + (i + 1), page: st.page, step: i + 1, title: st.title, text: [st.instruction, st.sloka].filter(Boolean).join(' ') })),
];
const q = process.argv.slice(2).join(' ');
if (!q) { console.log('उपयोग: node tools/rag-search.js "आपका प्रश्न"'); process.exit(0); }
const hits = RAG.search(RAG.build(chunks), q, 4);
if (!hits.length) console.log('(इस प्रश्न से मेल खाता कोई अंश नहीं मिला: आचार्य जी कहेंगे कि यह दस्तावेज़ में नहीं है)');
hits.forEach((h, i) => console.log(`${i + 1}. [पृष्ठ ${h.chunk.page}] ${h.chunk.title}  (अंक ${h.score.toFixed(1)})\n   ${h.chunk.text.slice(0, 160)}${h.chunk.text.length > 160 ? '…' : ''}`));
