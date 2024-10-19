# OpenAI Realtime API - Voice Chat

Minimal implementation of OpenAI's Realtime Voice API. The aim of this project was to create a simple enough voice assistant to test the capabilities and limitations of the Voice Agents created with the API.

The code heavily borrows from the [OpenAI Realtime Console example](https://github.com/openai/openai-realtime-console.git).

## The App

- This is a Next.js app written in TypeScript. You can run it locally with:
  `npm run dev` after installing the necessary dependencies with `npm install`.
- The app requires a valid OpenAI API key to be set in the `OPENAI_API_KEY` environment variable.
- The Voice Agent is a Push to Talk agent, so you need to click **Record** and then **Send** button to input your audio.
- VAD is tricky to test reliably as the exact algorithm used by OpenAI is not documented (might get back on this later).
- The app uses WebSockets to connect to the OpenAI API, so you need to make sure your firewall allows for WebSocket connections.
- Tested on Chrome, Safari. _Does not work on Desktop Firefox._ Works fine on Mobile.

## Limitations

As with any LLM, the responses are not deterministic, and the model may hallucinate. There are no additional guardrails added in place to prevent the model from saying harmful or inappropriate content. Please be mindful of this when using or extending the code.

## UI Screenshots

<p align="center">
  <img src="https://github.com/user-attachments/assets/500274b3-1fde-481e-9645-fe2a4ab4bcb5" width="120"/>
  <img src="https://github.com/user-attachments/assets/8e3e4ff3-e8bb-4442-8e65-f33dc7eb9bc9" width="120"/>
  <img src="https://github.com/user-attachments/assets/d6ef35b7-0ed6-4508-88d1-2dbdec364a72" width="120"/>
  <img src="https://github.com/user-attachments/assets/921568d0-aecb-445d-9cdc-e7bae558e6d5" width="120"/>
</p>
