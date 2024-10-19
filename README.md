# OpenAI Realtime API - Voice Chat

Minimal implementation of OpenAI's Realtime Voice API. The aim of this projects was to create a simple enough voice assistant to test the capabilities and limitations of the Voice Agents created with the API.

The code heavily borrows from the [OpenAI Realtime Console example](https://github.com/openai/openai-realtime-console.git).

## The App

- This is a Next.js app written in TypeScript. You can run it locally with:
  `npm run dev` after installing the necessary dependencies with `npm install`.
- The app requires a valid OpenAI API key to be set in the `OPENAI_API_KEY` environment variable.
- The Voice Agent is a Push to Talk agent, so you need to press and hold the button to talk.
- VAD is tricky to test reliably as the exact algorithm used by OpenAI is not documented (might get back on this later).
- The app uses WebSockets to connect to the OpenAI API, so you need to make sure your firewall allows for WebSocket connections.
- Tested on Chrome, Safari. _Does not work on Desktop Firefox._ Works fine on Mobile.

## Limitations

As with any LLM, the responses are not deterministic and the model may hallucinate. There are no additional guardrails added in place to prevent the model from saying harmful or inappropriate content. Please be mindful of this when using or extending the code.
