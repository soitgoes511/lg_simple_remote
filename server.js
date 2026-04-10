const fs = require("fs");
const path = require("path");

const dotenv = require("dotenv");
const express = require("express");

const { createTvClient } = require("./src/lg-tv-client");

dotenv.config({ quiet: true });

const app = express();

const port = Number.parseInt(process.env.PORT || "3000", 10);
const configPath = path.resolve(
  process.cwd(),
  process.env.CARTOONS_CONFIG || "./config/cartoons.json"
);
const keyFile = path.resolve(
  process.cwd(),
  process.env.TV_KEY_FILE || "./data/lgtv-keyfile"
);

fs.mkdirSync(path.dirname(keyFile), { recursive: true });

const tv = createTvClient({
  host: process.env.TV_HOST,
  mac: process.env.TV_MAC,
  keyFile
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function loadConfig() {
  const raw = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(raw);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Config must be a JSON object.");
  }

  if (!Array.isArray(parsed.actions)) {
    throw new Error("Config must contain an actions array.");
  }

  return parsed;
}

function toBrowserUrl(target) {
  if (!target) {
    return "https://www.youtube.com/";
  }

  if (/^https?:\/\//i.test(target)) {
    return target;
  }

  if (target.startsWith("v=")) {
    return `https://www.youtube.com/watch?${target}`;
  }

  if (target.startsWith("list=")) {
    return `https://www.youtube.com/playlist?${target}`;
  }

  return `https://www.youtube.com/results?search_query=${encodeURIComponent(target)}`;
}

async function runConfiguredAction(action) {
  switch (action.type) {
    case "youtube":
      try {
        const launchResult = await tv.launchApp("youtube.leanback.v4", {
          contentTarget: action.target || ""
        });

        return {
          ok: true,
          mode: "youtube-app",
          result: launchResult
        };
      } catch (error) {
        const fallbackUrl = toBrowserUrl(action.target);
        const browserResult = await tv.openBrowser(fallbackUrl);

        return {
          ok: true,
          mode: "browser-fallback",
          warning: error.message,
          result: browserResult
        };
      }

    case "browser":
      return {
        ok: true,
        mode: "browser",
        result: await tv.openBrowser(action.url)
      };

    case "app":
      return {
        ok: true,
        mode: "app",
        result: await tv.launchApp(action.appId, action.params || {})
      };

    case "toast":
      return {
        ok: true,
        mode: "toast",
        result: await tv.toast(action.message || "")
      };

    default:
      throw new Error(`Unsupported action type: ${action.type}`);
  }
}

app.get("/api/config", (req, res) => {
  try {
    const config = loadConfig();
    const usingPlaceholderHost = !process.env.TV_HOST;

    res.json({
      ...config,
      meta: {
        configPath,
        tvConfigured: !usingPlaceholderHost,
        wakeOnLanConfigured: Boolean(process.env.TV_MAC)
      }
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

app.get("/api/tv/status", async (req, res) => {
  try {
    const foregroundApp = await tv.getForegroundAppInfo();
    res.json({
      ok: true,
      connected: true,
      foregroundApp
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      connected: false,
      error: error.message
    });
  }
});

app.post("/api/tv/power/on", async (req, res) => {
  try {
    const result = await tv.powerOn();
    res.json({
      ok: true,
      result
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

app.post("/api/tv/power/off", async (req, res) => {
  try {
    const result = await tv.powerOff();
    res.json({
      ok: true,
      result
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

app.post("/api/tv/media/pause", async (req, res) => {
  try {
    const result = await tv.pause();
    res.json({
      ok: true,
      result
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

app.post("/api/tv/button/back", async (req, res) => {
  try {
    const result = await tv.sendButton("BACK");
    res.json({
      ok: true,
      result
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

app.post("/api/tv/apps/youtube", async (req, res) => {
  try {
    const result = await tv.launchApp("youtube.leanback.v4");
    res.json({
      ok: true,
      result
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

app.post("/api/actions/:id", async (req, res) => {
  try {
    const config = loadConfig();
    const action = config.actions.find((item) => item.id === req.params.id);

    if (!action) {
      res.status(404).json({
        ok: false,
        error: `Unknown action: ${req.params.id}`
      });
      return;
    }

    const result = await runConfiguredAction(action);
    res.json({
      ok: true,
      action: {
        id: action.id,
        label: action.label,
        type: action.type
      },
      ...result
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Cartoons launcher listening on http://localhost:${port}`);
  console.log(`Using config file: ${configPath}`);
});
