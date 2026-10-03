# आचार्य जी: Hindi-only Hindu priest voice agent

Standalone Node app (no dependencies, separate from the Next.js site).
Claude plays a Hindu priest who performs poojas for the Yajman: Hindi-only,
shlokas in Hindi/Sanskrit, pooja menu, text/voice/image input, and
interrupt-clarify-resume.

## Run
    cd hindu-priest-agent
    ANTHROPIC_API_KEY=... node server.js      # PowerShell: $env:ANTHROPIC_API_KEY="..."
Open http://localhost:3000 in Chrome or Edge (needed for hi-IN voice).

## Files
- `server.js`: Claude proxy, system prompt, Hindi-only guard
- `public/poojas.js`: pooja catalog and shlokas (add new poojas here)
- `public/index.html`: UI, TTS/STT, pooja runner, interruption handling
