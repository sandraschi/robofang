# Routines and Dawn Patrol

You can say things like **"dawn patrol 7am daily"** and have agents schedule a routine that:

1. Runs the **Yahboom robocar** on a round (patrol)
2. **Records video** during the patrol
3. **Analyzes** the video for unusual activity
4. Sends a **final report by email**

## How it works

- **Phrase → routine**: `POST /api/routines/from-phrase` with `{"phrase": "dawn patrol 7am daily", "report_email": "you@example.com"}`. The LLM parses the phrase into a stored routine (name, time 07:00, recurrence daily, action_type dawn_patrol).
- **Scheduling**: The **Routine Runner** hand (pulses every 60s) checks each routine; when local time matches (e.g. 07:00) and the routine has not run today, it runs it.
- **Dawn patrol workflow**: For action_type `dawn_patrol`, the orchestrator:
  1. Calls the **Yahboom** MCP backend tool `patrol_with_recording` (expects `duration_sec`, returns `video_path` or `video_url`).
  2. Runs **video analysis** (placeholder by default; integrate a vision model or motion detector for production).
  3. Builds a text report (start time, patrol result, analysis, unusual yes/no).
  4. **Sends the report by email** if `report_email` is set (in the routine params or in secret `comms_report_email`) and SMTP is configured.

## Setup

1. **Activate the Routine Runner hand**  
   `POST /api/hands/routine_runner/activate` so the scheduler runs.

2. **Create the routine from natural language**  
   `POST /api/routines/from-phrase`  
   Body: `{"phrase": "dawn patrol 7am daily", "report_email": "your@email.com"}`

3. **SMTP (for email report)**  
   Configure via secrets (e.g. onboarding/settings) or env:
   - `comms_smtp_host` / `ROBOFANG_SMTP_HOST`
   - `comms_smtp_port` / `ROBOFANG_SMTP_PORT` (default 587)
   - `comms_smtp_user` / `ROBOFANG_SMTP_USER`
   - `comms_smtp_password` / `ROBOFANG_SMTP_PASSWORD`
   - `comms_smtp_from` / `ROBOFANG_SMTP_FROM` (optional, defaults to user)

4. **Yahboom backend**  
   The robotics MCP server (yahboom) must be running and expose a tool that the bridge can call. The bridge calls `POST {yahboom_backend}/tool` with `{"name": "patrol_with_recording", "arguments": {"duration_sec": 120}}`. The backend should return something like `{"video_path": "/path/to/video.mp4"}` or `{"video_url": "..."}` so the bridge can pass it to the analysis step. If the tool name or contract differs, adjust `_run_dawn_patrol` and/or the backend.

## Hub: Schedule page

The RoboFang hub has a **Schedule** page (sidebar: Management → Schedule) where you can:

- See **Routine Runner** status and activate/pause it so scheduled routines run at their time.
- **Add routines** by typing a phrase (e.g. "dawn patrol 7am daily", "bug bash Friday 2pm weekly") and optional report email, then **Add**.
- View all **scheduled routines** (time, recurrence, action, last run) and **Run now** for testing.

## API summary

- `GET /api/routines` — list routines
- `POST /api/routines/from-phrase` — create routine from phrase (e.g. "dawn patrol 7am daily")
- `POST /api/routines/{id}/run` — run a routine once manually (e.g. for testing)

## Video analysis

The default `_analyze_patrol_video` in the orchestrator is a stub. For real “unusual activity” detection you can:

- Call a **vision model** (e.g. Ollama with a vision model) on sampled frames and ask for anomalies, or
- Run a **motion/anomaly** detector (e.g. OpenCV-based) and summarize results.

Implement that inside `orchestrator._analyze_patrol_video` and return a short summary string; the report will include it and set “Unusual activity: Yes/No” from that summary.
