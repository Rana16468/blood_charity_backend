import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./router";
import notFound from "./middleware/notFound";
import globalErrorHandelar from "./middleware/globalErrorHandelar";
import bodyParser from 'body-parser';
import monitorRouter from "./utility/metrics/metricsMiddleware";
// import cron from 'node-cron';
const app = express();

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

/**
 * ========================
 * CORS CONFIG (SECURE)
 * ========================
 */
app.use(
  cors()
);

/**
 * ========================
 * COOKIE PARSER
 * ========================
 */
app.use(cookieParser());
app.use(bodyParser.json());


app.use(
  express.json({
    verify: (req: express.Request, _res, buf) => {
      req.rawBody = buf;
    },
  })
);


app.use(express.urlencoded({ extended: true }));

/**
 * ========================
 * ROOT ROUTE
 * ========================
 */
app.get("/", (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rakto Daan — Telemetry & Diagnostics</title>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --color-bg: #0a0507;
            --color-card: rgba(20, 6, 8, 0.88);
            --color-crimson: #c0392b;
            --color-crimson-bright: #e74c3c;
            --color-crimson-glow: rgba(192, 57, 43, 0.35);
            --color-blood: #8b0000;
            --color-text: #f5e6e8;
            --color-text-muted: #9e7a7e;
            --color-border: rgba(192, 57, 43, 0.18);
            --color-border-hover: rgba(231, 76, 60, 0.45);
            --color-success: #27ae60;
            --color-error: #e74c3c;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            background-color: var(--color-bg);
            background-image:
                radial-gradient(ellipse at 15% 0%,   rgba(139, 0, 0, 0.22) 0px, transparent 55%),
                radial-gradient(ellipse at 85% 100%, rgba(192, 57, 43, 0.12) 0px, transparent 50%),
                radial-gradient(ellipse at 50% 50%,  rgba(60, 0, 0, 0.10)  0px, transparent 70%);
            color: var(--color-text);
            font-family: 'Inter', sans-serif;
            min-height: 100vh;
            padding: 2.5rem 1.5rem;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        /* ── Header ── */
        header { text-align: center; margin-bottom: 3rem; max-width: 800px; width: 100%; }

        .brand-subtitle {
            font-family: 'Cinzel', serif;
            color: var(--color-crimson-bright);
            font-size: 0.8rem;
            letter-spacing: 0.4em;
            text-transform: uppercase;
            margin-bottom: 0.65rem;
            opacity: 0.85;
        }

        h1 {
            font-family: 'Cinzel', serif;
            font-weight: 700;
            font-size: 2.4rem;
            letter-spacing: 0.04em;
            margin-bottom: 0.75rem;
            background: linear-gradient(135deg, #f5e6e8 0%, #e74c3c 55%, #8b0000 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .status-badge-container {
            display: inline-flex;
            justify-content: center;
            align-items: center;
            gap: 0.5rem;
            margin-top: 1rem;
            background: rgba(139, 0, 0, 0.15);
            border: 1px solid var(--color-border);
            padding: 0.4rem 1.2rem;
            border-radius: 100px;
        }

        .status-dot {
            width: 7px; height: 7px;
            background-color: var(--color-success);
            border-radius: 50%;
            box-shadow: 0 0 8px var(--color-success);
            animation: pulse 2s infinite;
        }

        .status-text {
            font-size: 0.78rem;
            color: var(--color-text-muted);
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }

        /* ── Grid ── */
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 1.25rem;
            max-width: 1200px;
            width: 100%;
        }

        /* ── Card ── */
        .card {
            background: var(--color-card);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--color-border);
            border-radius: 14px;
            padding: 1.7rem;
            position: relative;
            overflow: hidden;
            box-shadow: 0 4px 32px rgba(0, 0, 0, 0.55);
            transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        }

        /* Crimson top-edge shimmer */
        .card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent 0%, rgba(231, 76, 60, 0.55) 50%, transparent 100%);
        }

        .card:hover {
            transform: translateY(-3px);
            border-color: var(--color-border-hover);
            box-shadow: 0 12px 40px rgba(139, 0, 0, 0.28), 0 0 0 1px rgba(231, 76, 60, 0.08);
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.25rem;
        }

        .card-title {
            font-family: 'Cinzel', serif;
            font-size: 0.88rem;
            letter-spacing: 0.14em;
            color: var(--color-crimson-bright);
            text-transform: uppercase;
        }

        .card-icon { opacity: 0.75; }

        /* ── Metrics ── */
        .metric-value {
            font-size: 1.95rem;
            font-weight: 600;
            margin-bottom: 0.4rem;
            letter-spacing: -0.03em;
            color: #f5e6e8;
        }

        .metric-sub { font-size: 0.82rem; color: var(--color-text-muted); }

        /* ── Progress bar ── */
        .progress-bar-container {
            width: 100%; height: 4px;
            background: rgba(255, 255, 255, 0.04);
            border-radius: 2px;
            margin-top: 1.1rem;
            overflow: hidden;
        }

        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, var(--color-blood) 0%, var(--color-crimson-bright) 100%);
            border-radius: 2px;
            width: 0%;
            transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 0 10px var(--color-crimson-glow);
        }

        /* ── Info rows ── */
        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.88rem;
            padding: 0.7rem 0;
            border-bottom: 1px solid rgba(192, 57, 43, 0.1);
        }

        .info-row:last-child { border-bottom: none; margin-bottom: 0; }
        .info-label { color: var(--color-text-muted); }
        .info-value { font-weight: 500; color: #f5e6e8; }

        /* ── Health matrix blocks ── */
        .health-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 1.25rem;
            text-align: center;
            margin-top: 1.2rem;
        }

        .health-block {
            padding: 1.25rem 1rem;
            background: rgba(139, 0, 0, 0.12);
            border: 1px solid rgba(192, 57, 43, 0.2);
            border-radius: 10px;
        }

        .health-label {
            font-size: 0.74rem;
            color: var(--color-text-muted);
            letter-spacing: 0.1em;
            text-transform: uppercase;
            margin-bottom: 0.6rem;
        }

        /* ── Footer ── */
        footer {
            margin-top: 4rem;
            text-align: center;
            font-size: 0.78rem;
            color: var(--color-text-muted);
            letter-spacing: 0.1em;
            font-family: 'Cinzel', serif;
        }

        footer span { color: var(--color-crimson-bright); }

        /* ── Pulse animation ── */
        @keyframes pulse {
            0%   { transform: scale(0.95); box-shadow: 0 0 0 0   rgba(39, 174, 96, 0.7); }
            70%  { transform: scale(1);    box-shadow: 0 0 0 8px rgba(39, 174, 96, 0);   }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0   rgba(39, 174, 96, 0);   }
        }

        .grid-full-width { grid-column: 1 / -1; }
    </style>
</head>
<body>

    <header>
        <div class="brand-subtitle">&#9632; Rakto Daan &#9632;</div>
        <h1>Telemetry &amp; Real-Time Diagnostics</h1>
        <div class="status-badge-container">
            <div class="status-dot"></div>
            <div class="status-text">Server Active &amp; Healthy</div>
        </div>
    </header>

    <main class="dashboard-grid">

        <!-- RAM -->
        <div class="card">
            <div class="card-header">
                <div class="card-title">RAM Allocations</div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="card-icon" style="color:var(--color-crimson-bright)">
                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                    <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                    <line x1="6" y1="6" x2="6.01" y2="6"></line>
                    <line x1="6" y1="18" x2="6.01" y2="18"></line>
                </svg>
            </div>
            <div class="metric-value" id="ram-val">— GB</div>
            <div class="metric-sub"  id="ram-sub">Loading...</div>
            <div class="progress-bar-container">
                <div class="progress-bar" id="ram-bar"></div>
            </div>
        </div>

        <!-- CPU -->
        <div class="card">
            <div class="card-header">
                <div class="card-title">Processor Load</div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="card-icon" style="color:var(--color-crimson-bright)">
                    <rect x="4" y="4" width="16" height="16" rx="2"></rect><rect x="9" y="9" width="6" height="6"></rect>
                    <line x1="9"  y1="1"  x2="9"  y2="4"></line><line x1="15" y1="1"  x2="15" y2="4"></line>
                    <line x1="9"  y1="20" x2="9"  y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line>
                    <line x1="20" y1="9"  x2="23" y2="9"></line><line x1="20" y1="15" x2="23" y2="15"></line>
                    <line x1="1"  y1="9"  x2="4"  y2="9"></line><line x1="1"  y1="15" x2="4"  y2="15"></line>
                </svg>
            </div>
            <div class="metric-value" id="cpu-val">—</div>
            <div class="metric-sub"  id="cpu-sub">Loading...</div>
        </div>

        <!-- Storage -->
        <div class="card">
            <div class="card-header">
                <div class="card-title">System Disk</div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="card-icon" style="color:var(--color-crimson-bright)">
                    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path>
                </svg>
            </div>
            <div class="metric-value" id="storage-val">— GB</div>
            <div class="metric-sub"  id="storage-sub">Loading...</div>
            <div class="progress-bar-container">
                <div class="progress-bar" id="storage-bar"></div>
            </div>
        </div>

        <!-- API Traffic -->
        <div class="card">
            <div class="card-header">
                <div class="card-title">API Server Traffic</div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="card-icon" style="color:var(--color-crimson-bright)">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                </svg>
            </div>
            <div class="info-row">
                <div class="info-label">Hits / Minute</div>
                <div class="info-value" id="hits-min" style="color:var(--color-crimson-bright);font-size:1.1rem;">0</div>
            </div>
            <div class="info-row">
                <div class="info-label">Hits / Hour</div>
                <div class="info-value" id="hits-hour" style="color:var(--color-crimson-bright);font-size:1.1rem;">0</div>
            </div>
        </div>

        <!-- System & Users -->
        <div class="card">
            <div class="card-header">
                <div class="card-title">System &amp; Users</div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="card-icon" style="color:var(--color-crimson-bright)">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
            </div>
            <div class="info-row">
                <div class="info-label">Total Registered Users</div>
                <div class="info-value" id="users-total">—</div>
            </div>
            <div class="info-row">
                <div class="info-label">Active Verified Users</div>
                <div class="info-value" id="users-active" style="color:var(--color-success)">—</div>
            </div>
        </div>

        <!-- Server Specs -->
        <div class="card">
            <div class="card-header">
                <div class="card-title">Server Specs</div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="card-icon" style="color:var(--color-crimson-bright)">
                    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                    <line x1="7"  y1="2"  x2="7"  y2="22"></line><line x1="17" y1="2"  x2="17" y2="22"></line>
                    <line x1="2"  y1="12" x2="22" y2="12"></line>
                    <line x1="2"  y1="7"  x2="22" y2="7"></line><line x1="2"  y1="17" x2="22" y2="17"></line>
                </svg>
            </div>
            <div class="info-row">
                <div class="info-label">OS Platform</div>
                <div class="info-value" id="os-platform" style="text-transform:capitalize;">—</div>
            </div>
            <div class="info-row">
                <div class="info-label">Uptime</div>
                <div class="info-value" id="uptime">—</div>
            </div>
        </div>

        <!-- Health Matrix (full width) -->
        <div class="card grid-full-width">
            <div class="card-header">
                <div class="card-title">API Health Matrix</div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="card-icon" style="color:var(--color-crimson-bright)">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
            </div>
            <div class="health-grid">
                <div class="health-block">
                    <div class="health-label">Average Latency</div>
                    <div class="metric-value" id="health-latency" style="color:var(--color-crimson-bright);font-size:2.2rem;margin-top:0.5rem;">— ms</div>
                </div>
                <div class="health-block">
                    <div class="health-label">Success Rate</div>
                    <div class="metric-value" id="health-success" style="color:var(--color-success);font-size:2.2rem;margin-top:0.5rem;">—%</div>
                </div>
                <div class="health-block">
                    <div class="health-label">Error Count</div>
                    <div class="metric-value" id="health-errors" style="color:var(--color-error);font-size:2.2rem;margin-top:0.5rem;">—</div>
                </div>
            </div>
        </div>

    </main>

    <footer>&#9632; Powered by <span>Rakto Daan</span> Backend &#9632;</footer>

    <script>
        async function fetchMetrics() {
            try {
                const res = await fetch('/api/v1/monitor/metrics');
                if (!res.ok) return;
                const d = await res.json();

                document.getElementById('ram-val').innerText     = d.ram.usedGB + ' GB';
                document.getElementById('ram-sub').innerText     = d.ram.usedGB + ' GB / ' + d.ram.totalGB + ' GB used';
                document.getElementById('ram-bar').style.width   = d.ram.percent + '%';

                document.getElementById('cpu-val').innerText     = d.cpu.load1m.toFixed(2);
                document.getElementById('cpu-sub').innerText     = d.cpu.model;

                document.getElementById('storage-val').innerText   = d.storage.usedGB + ' GB';
                document.getElementById('storage-sub').innerText   = d.storage.usedGB + ' GB / ' + d.storage.totalGB + ' GB used';
                document.getElementById('storage-bar').style.width = d.storage.percent + '%';

                document.getElementById('hits-min').innerText   = d.traffic.hitsMin;
                document.getElementById('hits-hour').innerText  = d.traffic.hitsHour;

                document.getElementById('users-total').innerText  = d.users.total;
                document.getElementById('users-active').innerText = d.users.active;

                document.getElementById('os-platform').innerText = d.osPlatform;
                document.getElementById('uptime').innerText      = d.uptimeHours + ' hours';

                document.getElementById('health-latency').innerText = d.health.avgLatencyMs + ' ms';
                document.getElementById('health-success').innerText = d.health.successRatePercent + '%';
                document.getElementById('health-errors').innerText  = d.health.errorCount;

            } catch (err) {
                console.error('Failed to fetch diagnostics:', err);
            }
        }

        fetchMetrics();
        setInterval(fetchMetrics, 3000);
    </script>
</body>
</html>`);
});

/**
 * ========================
 * API ROUTES
 * ========================
 */
app.use("/api/v1", router);
app.use("/api/v1/monitor", monitorRouter); // ← metrics endpoint

/**
 * ========================
 * ERROR HANDLING
 * ========================
 */
app.use(notFound);
app.use(globalErrorHandelar);

export default app;