// हर श्लोक के पाठ से एक छोटा, स्थिर नाम (हैश) बनाता है। ऑडियो फ़ाइल का नाम यही होता है,
// इसलिए पूजा के चरण, संग्रह और जप, सब जगह एक ही पाठ के लिए एक ही रिकॉर्डिंग मिल जाती है।
// ब्राउज़र और टूल, दोनों यही फ़ाइल इस्तेमाल करते हैं, ताकि नाम हमेशा मेल खाएँ।
(function (root) {
  const norm = (t) => String(t).replace(/\s+/g, ' ').trim();
  const key = (t) => {
    let h = 0x811c9dc5; const s = norm(t);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
  };
  const api = { norm, key };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.AUDIOKEY = api;
})(typeof self !== 'undefined' ? self : this);
