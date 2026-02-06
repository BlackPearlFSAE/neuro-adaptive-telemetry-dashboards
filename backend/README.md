# NATS Backend

Neuro-Adaptive Telemetry System backend with FastAPI and WebSocket support.

## Run

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

WebSocket endpoint: `ws://localhost:8001/ws`
