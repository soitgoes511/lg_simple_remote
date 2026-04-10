const titleEl = document.querySelector("#page-title");
const subtitleEl = document.querySelector("#page-subtitle");
const tvStatusEl = document.querySelector("#tv-status");
const configStatusEl = document.querySelector("#config-status");
const messageEl = document.querySelector("#message");
const launcherGridEl = document.querySelector("#launcher-grid");
const cardTemplate = document.querySelector("#card-template");

function setMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.dataset.error = isError ? "true" : "false";
}

function setPill(element, text, tone) {
  element.textContent = text;
  element.className = `pill ${tone}`;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

async function loadConfig() {
  const config = await fetchJson("/api/config");

  titleEl.textContent = config.title || "Cartoons";
  subtitleEl.textContent =
    config.subtitle || "A simple page with big buttons for favorite shows.";

  launcherGridEl.innerHTML = "";

  for (const action of config.actions) {
    const card = cardTemplate.content.firstElementChild.cloneNode(true);
    const labelEl = card.querySelector(".launcher-card__label");
    const detailEl = card.querySelector(".launcher-card__detail");

    labelEl.textContent = action.label;
    detailEl.textContent = action.description || action.type;

    if (action.accent) {
      card.style.setProperty("--card-accent", action.accent);
    }

    card.addEventListener("click", async () => {
      try {
        setMessage(`Opening ${action.label}...`);
        const result = await fetchJson(`/api/actions/${encodeURIComponent(action.id)}`, {
          method: "POST"
        });

        const modeLabel =
          result.mode === "browser-fallback"
            ? "The TV browser was used as a fallback."
            : "Sent to the TV.";

        setMessage(`${action.label} launched. ${modeLabel}`);
        await refreshStatus();
      } catch (error) {
        setMessage(error.message, true);
      }
    });

    launcherGridEl.appendChild(card);
  }

  const configTone = config.meta?.tvConfigured ? "pill-good" : "pill-warn";
  const configLabel = config.meta?.tvConfigured
    ? "TV IP configured"
    : "Add TV_HOST to .env";

  setPill(configStatusEl, configLabel, configTone);
}

async function refreshStatus() {
  try {
    const status = await fetchJson("/api/tv/status");
    const appTitle =
      status.foregroundApp?.appId || status.foregroundApp?.id || "TV connected";

    setPill(tvStatusEl, `Connected: ${appTitle}`, "pill-good");
  } catch (error) {
    setPill(tvStatusEl, "TV not reachable yet", "pill-warn");
  }
}

async function runQuickCommand(command) {
  try {
    switch (command) {
      case "power-on":
        setMessage("Sending power on...");
        await fetchJson("/api/tv/power/on", { method: "POST" });
        setMessage("Power-on packet sent.");
        break;

      case "youtube-home":
        setMessage("Opening YouTube...");
        await fetchJson("/api/tv/apps/youtube", { method: "POST" });
        setMessage("YouTube launched.");
        break;

      case "pause":
        setMessage("Pausing playback...");
        await fetchJson("/api/tv/media/pause", { method: "POST" });
        setMessage("Pause sent to the TV.");
        break;

      case "back":
        setMessage("Sending Back...");
        await fetchJson("/api/tv/button/back", { method: "POST" });
        setMessage("Back sent to the TV.");
        break;

      case "power-off":
        setMessage("Turning the TV off...");
        await fetchJson("/api/tv/power/off", { method: "POST" });
        setMessage("Turn-off sent to the TV.");
        break;

      case "refresh-status":
        setMessage("Refreshing TV status...");
        break;

      default:
        return;
    }

    await refreshStatus();
  } catch (error) {
    setMessage(error.message, true);
  }
}

for (const button of document.querySelectorAll("[data-command]")) {
  button.addEventListener("click", () => runQuickCommand(button.dataset.command));
}

async function init() {
  try {
    await loadConfig();
  } catch (error) {
    setPill(configStatusEl, "Config error", "pill-warn");
    setMessage(error.message, true);
  }

  await refreshStatus();
}

init();
