# आचार्य जी: Hindi-only Hindu priest voice agent

Standalone Node app (separate from the Next.js site). Claude plays a Hindu priest
who performs poojas for the Yajman: Hindi-only, shlokas in Hindi/Sanskrit,
text/voice/image input, interrupt-clarify-resume.

## Run
    cd hindu-priest-agent
    npm install
    node server.js
Open http://localhost:3000 in Edge or Chrome (hi-IN voice and mic).

Auth: with `ANTHROPIC_API_KEY` set it calls the API directly; otherwise it uses the
Claude Agent SDK with your Claude login (personal testing only). One-time login:
`node_modules\@anthropic-ai\claude-agent-sdk-win32-x64\claude.exe auth login`.
If neither works the page falls back to a limited keyword-based offline mode.

## Flow
1. Yajman picks one of six ready poojas, or names any other Hindu pooja (Claude
   builds it on the standard skeleton, using only mantras it is sure of).
2. Priest lists the preparation (bath, place, direction, day) and the samagri, and
   waits until the Yajman says "मैं तैयार हूँ". He then states the benefit and the
   do/don't notes.
3. Pooja runs step by step. At a few easy mantras the priest asks the Yajman to
   repeat it and checks the spoken or typed reply; after 3 misses it moves on.
   Longer paath (Rudrashtakam, Hanuman Chalisa, ...) are optional: the priest asks yes/no first.
4. The Yajman can interrupt any time: the priest restates the ask, answers, then resumes.
5. After a pooja finishes, another can be started without repeating the first.

## Recorded voices (optional, better pronunciation)
Mantras and shlokas can be played from audio files instead of the browser voice.
Files are generated with the open-source Indic Parler-TTS through its Hugging Face Space
(no key or GPU needed; free GPU quota is limited, so large runs may need retries).

    node tools/export-jobs.js                      # list of texts to record -> tools/audio-jobs.json
    node tools/generate-audio.js --samples         # a few mantras in 2 voices, then open /samples.html to listen
    node tools/generate-audio.js --all --speaker Aryan   # record everything (resumable)

The app looks up each shloka by a hash of its text in public/audio/manifest.json and plays the file;
if a file is missing or fails it falls back to the browser voice. To use a real pandit's recording,
replace a file in public/audio/ with the same name.

## Lakshmi pooja from a document (RAG)
The Lakshmi (Diwali) pooja follows only one supplied PDF ("दीपावली पूजन विधि और मंत्र", 4 pages).
- `public/knowledge/lakshmi.js` holds that document: samagri, preparation, the 36 ordered steps and the mantras,
  transcribed faithfully (only clear print errors fixed; every deviation is listed in its `notes`).
- The pooja steps, samagri and instructions for Lakshmi come only from it. Nothing is added from outside
  (no echo checks, optional paath, karpur aarti or closing shanti step).
- `public/rag.js` is a small BM25 retriever (no GPU, no external service). For every message about the Lakshmi pooja the
  server retrieves the most relevant passages and gives them to the priest with the full step order; the priest answers only from
  them and says "this is not in the document" otherwise.
- Test retrieval yourself: `node tools/rag-search.js "कलश में क्या रखें"`
- Sankalp placeholders {नाम}, {गोत्र}, {स्थान}: the priest asks the Yajman for name, gotra and city or village before starting.
- If `public/knowledge/lakshmi.js` is missing, the app falls back to the generic Lakshmi pooja.
- The knowledge folder is git-ignored by default (it is derived from a copyrighted article); remove that line from .gitignore to commit it.

## Files
- `server.js`: Claude call (API or Agent SDK), system prompt, Hindi-only guard
- `public/poojas.js`: pooja catalog, shlokas, custom-pooja builder
- `public/index.html`: UI, voice, pooja runner, echo check, interruption handling

## Noise and echo handling (microphone)
The page listens through the browser's speech recognizer, so a cough, a bell, a TV or the priest's own voice coming back
through the speaker could stop the pooja. Settings (top bar):
- **शोर से बचाव** (on by default): the priest is interrupted only by 2+ words spoken for about half a second, or a full sentence
  recognised with decent confidence; stop words ("रुकिए", "रुको", "आचार्य जी") always work. What the priest said in the last
  ~25 s is remembered and anything that matches it (his own echo) is ignored. The mic is ignored while he chants a shloka and
  while you repeat along (sankalp and repeat-after-me steps).
- **पुश-टू-टॉक**: the mic listens only while Space (or the mic button) is held. Best for a noisy room or during aarti.
- After a false stop with no clear command, the pooja resumes by itself in about 4 seconds (`AUTO_RESUME_MS` in `index.html`).
- Headphones remove echo completely.
