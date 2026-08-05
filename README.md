# VoiceShield

**Category:** Voice Compliance Component | **Status:** Hackathon-stage development

Vite/React dashboard for testing voice agents against EU AI Act requirements. VoiceShield is the core compliance engine powering VoiceGate. It processes voice interactions, transcribes conversations, analyzes agent responses against compliance rules, and produces Pass/Fail/Flag verdicts with explicit rule citations.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite. Configure AIML and Speechmatics keys from **Settings**. Mock mode works without keys.

## Checks

```bash
npm run typecheck
npm run build
```

## Documentation

Engineering specifications:

- `../voice_processing_specifications/000_index.txt`
- `../voice_processing_specifications/001_voice_transcription_concept.txt`
- `../voice_processing_specifications/017_voicegate_scoring_rules.txt`

## Contributing

Contributions are welcome via Pull Requests.

## Security

See `../SECURITY.md`.

## License

See `../LICENSE.md`.