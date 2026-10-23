"""अपने कंप्यूटर पर (CPU से) Indic Parler-TTS चलाकर मंत्रों की रिकॉर्डिंग बनाना।

Hugging Face Space वाली ही मॉडल और वही आवाज़-वर्णन (Aryan), पर बिना GPU-सीमा के; धीमा, पर मुफ़्त।

उपयोग (tools/local-tts/venv वाले Python से):
  python tools/local_tts.py --bench                      # एक छोटा मंत्र बनाकर समय नापना
  python tools/local_tts.py --all                        # सारे बाकी मंत्र (रुककर फिर चलाने पर वहीं से आगे)
  python tools/local_tts.py --all --only library         # पहले केवल मंत्र संग्रह वाले
  python tools/local_tts.py --all --limit 10             # सिर्फ़ 10 नए
पहले एक बार: node tools/export-jobs.js   (बनाने वाले पाठों की सूची tools/audio-jobs.json में)
"""
import argparse
import json
import os
import sys
import time

import numpy as np
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'public', 'audio')
MODEL = 'ai4bharat/indic-parler-tts'
DESC = ('{sp} chants slowly in a deep, calm, devotional voice, with clear pronunciation and a short pause after each phrase. '
        'The recording is very high quality with no background noise.')


def chunk(text, mx=200):
    """लंबा पाठ अर्ध-पंक्तियों में तोड़ना (tools/generate-audio.js जैसा ही)।"""
    parts, cur, out = [], '', []
    buf = ''
    for ch in text:
        buf += ch
        if ch in '।॥':
            parts.append(buf.strip()); buf = ''
    if buf.strip():
        parts.append(buf.strip())
    for p in parts:
        if len(cur + ' ' + p) > mx and cur:
            out.append(cur); cur = p
        else:
            cur = (cur + ' ' + p).strip()
    if cur:
        out.append(cur)
    return out


def to_mp3(audio, sr, kbps):
    import lameenc
    pcm = (np.clip(audio, -1, 1) * 32767).astype(np.int16)
    enc = lameenc.Encoder()
    enc.set_bit_rate(kbps); enc.set_in_sample_rate(sr); enc.set_channels(1); enc.set_quality(2)
    return bytes(enc.encode(pcm.tobytes()) + enc.flush())


class Engine:
    def __init__(self, dtype, threads):
        from parler_tts import ParlerTTSForConditionalGeneration
        from transformers import AutoTokenizer
        if threads:
            torch.set_num_threads(threads)
        t0 = time.time()
        dt = {'fp32': torch.float32, 'bf16': torch.bfloat16}[dtype]
        self.model = ParlerTTSForConditionalGeneration.from_pretrained(MODEL, torch_dtype=dt, low_cpu_mem_usage=True).to('cpu').eval()
        self.tok = AutoTokenizer.from_pretrained(MODEL)
        self.dtok = AutoTokenizer.from_pretrained(self.model.config.text_encoder._name_or_path)
        self.sr = self.model.config.sampling_rate
        print(f'मॉडल लोड हुआ ({dtype}, {torch.get_num_threads()} थ्रेड) {time.time() - t0:.0f} सेकंड में', flush=True)

    def say(self, text, speaker):
        d = self.dtok(DESC.format(sp=speaker), return_tensors='pt')
        p = self.tok(text, return_tensors='pt')
        torch.manual_seed(0)
        with torch.inference_mode():
            out = self.model.generate(input_ids=d.input_ids, attention_mask=d.attention_mask,
                                      prompt_input_ids=p.input_ids, prompt_attention_mask=p.attention_mask)
        return out.float().cpu().numpy().squeeze()

    def make(self, text, speaker):
        gap = np.zeros(int(self.sr * 0.35), dtype=np.float32)
        pieces = []
        for c in chunk(text):
            pieces += [self.say(c, speaker), gap]
        return np.concatenate(pieces[:-1]) if pieces else np.zeros(1, dtype=np.float32)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--bench', action='store_true', help='एक छोटा मंत्र बनाकर समय नापना')
    ap.add_argument('--all', action='store_true', help='सारे बाकी मंत्र बनाना')
    ap.add_argument('--only', choices=['library', 'poojas', 'lakshmi'], help='केवल इस समूह के')
    ap.add_argument('--limit', type=int, default=0, help='इतने नए ही बनाना')
    ap.add_argument('--speaker', default='Aryan')
    ap.add_argument('--dtype', choices=['fp32', 'bf16'], default='fp32')
    ap.add_argument('--threads', type=int, default=0, help='CPU थ्रेड (0 = अपने-आप)')
    ap.add_argument('--kbps', type=int, default=96, help='MP3 की गुणवत्ता; कम = छोटी फ़ाइल')
    a = ap.parse_args()

    if a.bench:
        eng = Engine(a.dtype, a.threads)
        text = 'ॐ नमः शिवाय॥'
        import psutil
        for n in (1, 2):                                  # दूसरी बार वाली गति ही असली गति है (पहली में गर्म होना भी जुड़ता है)
            t0 = time.time(); audio = eng.make(text, a.speaker); dt = time.time() - t0
            secs = len(audio) / eng.sr
            ram = psutil.virtual_memory()
            print(f'बनाया ({n}): "{text}" -> {secs:.1f} सेकंड की आवाज़, {dt:.0f} सेकंड में (हर 1 सेकंड आवाज़ के लिए {dt / secs:.1f} सेकंड); खाली RAM {ram.available / 1048576:.0f} MB', flush=True)
        os.makedirs(os.path.join(HERE, 'samples'), exist_ok=True)
        with open(os.path.join(HERE, 'samples', 'local-bench.mp3'), 'wb') as f:
            f.write(to_mp3(audio, eng.sr, a.kbps))
        return

    if not a.all:
        print(__doc__); return
    jobs = json.load(open(os.path.join(HERE, 'audio-jobs.json'), encoding='utf-8'))
    if a.only == 'library':
        jobs = [j for j in jobs if ' / ' in j['title'] and not j['title'].split(' / ')[0].endswith(('पूजन', 'पूजा', 'रुद्राभिषेक', '(दीपावली)'))]
    elif a.only == 'poojas':
        jobs = [j for j in jobs if j['title'].split(' / ')[0].endswith(('पूजन', 'पूजा', 'रुद्राभिषेक', '(दीपावली)'))]
    elif a.only == 'lakshmi':
        jobs = [j for j in jobs if 'लक्ष्मी पूजन (दीपावली)' in j['title']]
    os.makedirs(OUT, exist_ok=True)
    mf = os.path.join(OUT, 'manifest.json')
    manifest = json.load(open(mf, encoding='utf-8')) if os.path.exists(mf) else {}
    todo = [j for j in jobs if not os.path.exists(os.path.join(OUT, j['key'] + '.mp3'))]
    for j in jobs:
        if os.path.exists(os.path.join(OUT, j['key'] + '.mp3')):
            manifest[j['key']] = j['key'] + '.mp3'
    print(f'कुल {len(jobs)} में बाकी {len(todo)}', flush=True)
    if a.limit:
        todo = todo[:a.limit]
    if not todo:
        print('कुछ बनाना बाकी नहीं।'); return
    eng = Engine(a.dtype, a.threads)
    t_all = time.time()
    for i, j in enumerate(todo, 1):
        t0 = time.time()
        try:
            audio = eng.make(j['text'], a.speaker)
            with open(os.path.join(OUT, j['key'] + '.mp3'), 'wb') as f:
                f.write(to_mp3(audio, eng.sr, a.kbps))
            manifest[j['key']] = j['key'] + '.mp3'
            json.dump(manifest, open(mf, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
            el = time.time() - t0
            left = (len(todo) - i) * ((time.time() - t_all) / i) / 60
            print(f'[{i}/{len(todo)}] {j["title"][:60]} ... ठीक ({len(audio) / eng.sr:.0f} सेकंड आवाज़, {el:.0f} सेकंड लगे; करीब {left:.0f} मिनट बाकी)', flush=True)
        except Exception as e:  # noqa: BLE001
            print(f'[{i}/{len(todo)}] {j["title"][:60]} ... विफल: {str(e)[:120]}', flush=True)
    print('पूरा।', flush=True)


if __name__ == '__main__':
    sys.exit(main())
