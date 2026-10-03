# BanterCore Agent Service

Mastra-compatible TypeScript agent service for discussion intelligence.

## Run locally

```powershell
cd agent-service
npm.cmd install
$env:OPENAI_API_KEY="your-key"
npm.cmd run dev
```

The service listens on `http://localhost:4110`.

## Endpoint

`POST /v1/thread-summary`

```json
{
  "topic": "Should AI be used in education?",
  "body": "Opening discussion...",
  "replies": ["One reply", "Another reply"]
}
```

It returns a structured summary, key viewpoints, and discussion tone. Keep `OPENAI_API_KEY` in the agent service environment only; never expose it in React.
