# Changelog

## [0.1.0] - {PR_MERGE_DATE}

- First release: Cozy Studio's jobs in progress, failed batches, jobs to review,
  ChatGPT usage, unorganized Library images and Studio status in a sidebar
  section, a sidebar mode and a side panel.
- Rows open the exact batch or job in Studio, and the review row opens the jobs
  to review. Studio 0.2.0 and older open the workspace.
- Organize with an agent: a workspace's menu opens a new agent with an organize
  prompt ready to send. Without the agents.start permission the panel leaves
  the action out and says how to allow it.
- Light on Studio: with a Studio newer than 0.2.0 it reads Studio's jobs
  summary (about 2 KB) when a job changes state and follows Studio's agent
  event stream, which stops when Agent access is off. Studio 0.2.0 and older
  get one full jobs snapshot plus the UI event stream.
- Workers on the Studio tab: busy workers out of the total, the queue and each
  provider with work against its limit ("ChatGPT 3/8"), with a warning when
  provider dispatch is on hold or the Codex app-server is running. Read from
  Studio's health check every minute while jobs run, every 10 minutes when idle.
- Start, restart and stop Studio from the panel on Windows. Start runs
  `bun run scripts/dev.ts` in Studio's folder, which the panel learns from a
  running Studio, with a hidden console of its own so it keeps running after
  Ghostex closes. It never starts a second Studio while one runs or its ports
  are taken. Restart uses Studio's own restart when it can. Stop asks Studio to
  shut down by itself and ends only Studio's processes if it is still up 15
  seconds later. Stop and Restart ask first when jobs are running or queued. Open
  Studio goes to the UI dev server on port 17222 while it runs.
- Keep Studio running (Windows, off by default): a switch on the Studio tab
  that starts Studio again when two checks 15 seconds apart find it down, with
  Start's checks, longer waits between starts and a stop after 3 failed starts
  in 10 minutes. Stop in the panel pauses it until the next Start. The panel
  keeps the time of each outage and shows the last one.
- One server at a time: the extension's server exits within 5 seconds when the
  Ghostex that started it goes away, so a Ghostex restart or update leaves no
  server behind. Only one server keeps Studio running, through `keeper.lock` in
  the extension's data folder, and it reads `keeper.json` again before each
  start, so a Stop in another server's panel pauses it.
- Outages and logs: the Studio tab lists the last 20 times Studio was down,
  each with a copy of the end of Studio's output and error log from then, and
  opens Studio's log and logs folder.
- Stuck jobs: the Jobs tab counts jobs running with no update for 30 minutes
  next to the jobs to review, with buttons that open them in Studio.
- Updates: the new commits, Check for updates, and Update and restart through
  Studio's own update. With jobs in flight, Update anyway asks first, says how
  many jobs it interrupts, and Studio requeues and resumes them after the
  restart.
- Recent errors from Studio's log, the free space on the Library's disk with
  the database's size and schema version, and what each Agent access level
  lets agents do.
- Finds Studio on another port through the discovery file Studio writes.
