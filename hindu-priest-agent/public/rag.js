// दस्तावेज़ के अंशों में खोज (RAG का "R"): बिना GPU और बिना बाहरी सेवा के चलने वाला BM25।
// हिंदी-संस्कृत में एक ही शब्द के कई रूप होते हैं (लक्ष्मी, लक्ष्म्यै, महालक्ष्म्यै), इसलिए शब्दों के साथ
// उनके अक्षर-समूह (3-ग्राम) पर भी मिलान किया जाता है। सर्वर और ब्राउज़र, दोनों इसे चला सकते हैं।
(function (root) {
  const STOP = new Set('का की के को से में पर और या है हैं हो कर करें करे लें ले दें दे जो यह वह इस उस तथा एवं भी ही तो ना न ऊं ॐ ओं नम नमः नम: कि क्या कौन कैसे कब कहाँ कहां क्यों बताइए बताओ बताएं'.split(' '));
  // एक-सा रूप: अनुस्वार/चंद्रबिंदु, नुक़्ता, विसर्ग, शून्य-चौड़ाई चिह्न, पूर्ण-विराम हटाकर
  const norm = (s) => String(s || '').toLowerCase()
    .replace(/[​-‍़]/g, '').replace(/[ंँः:]/g, '').replace(/[ॐऊ]ं?/g, 'ॐ')
    .replace(/[।॥|,.;!?()"“”‘’\-–—\[\]{}]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = (s) => norm(s).split(' ').filter((w) => w.length > 1 && !STOP.has(w));
  const grams = (w) => { const g = []; if (w.length < 3) return g; for (let i = 0; i + 3 <= w.length; i++) g.push('#' + w.slice(i, i + 3)); return g; };
  const tokens = (s) => { const out = []; for (const w of words(s)) { out.push(w); out.push(...grams(w)); } return out; };

  function build(chunks, { k1 = 1.4, b = 0.7 } = {}) {
    const docs = chunks.map((c) => {
      // शीर्ष के शब्द दो बार गिने जाते हैं: "अंग पूजा" जैसे शीर्षक वाला अंश ऊपर आए
      const toks = tokens([c.title, c.title, c.text].filter(Boolean).join(' '));
      const tf = new Map(); toks.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));
      return { chunk: c, tf, len: toks.length };
    });
    const df = new Map(); docs.forEach((d) => d.tf.forEach((_, t) => df.set(t, (df.get(t) || 0) + 1)));
    const avg = docs.reduce((n, d) => n + d.len, 0) / Math.max(1, docs.length);
    return { docs, df, avg, N: docs.length, k1, b };
  }
  // वापसी: [{chunk, score}] घटते क्रम में; score 0 वाले नहीं
  function search(index, query, k = 4, { minScore = 3, minRatio = 0.15 } = {}) {
    const q = tokens(query); if (!q.length) return [];
    const seen = new Set(); const uq = q.filter((t) => (seen.has(t) ? false : seen.add(t)));
    const out = index.docs.map((d) => {
      let s = 0;
      for (const t of uq) {
        const f = d.tf.get(t); if (!f) continue;
        const n = index.df.get(t), idf = Math.log(1 + (index.N - n + 0.5) / (n + 0.5));
        s += idf * (f * (index.k1 + 1)) / (f + index.k1 * (1 - index.b + index.b * d.len / index.avg));
      }
      return { chunk: d.chunk, score: s };
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
    // बहुत कम अंक वाले मेल (असंबंधित प्रश्न) और सबसे अच्छे मेल से बहुत पीछे वाले हटाना
    const top = out.length ? out[0].score : 0;
    return out.filter((x) => x.score >= minScore && x.score >= top * minRatio).slice(0, k);
  }
  const api = { build, search, tokens, norm };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.RAG = api;
})(typeof self !== 'undefined' ? self : this);
