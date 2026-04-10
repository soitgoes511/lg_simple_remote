# LG webOS Cartoons Launcher

This project gives you a simple private launcher page for your daughter's favorite cartoons.

You run it on your home server. Then you open the page from your phone. When you tap a button like `Bluey`, the home server sends the command to the LG TV over your local network.

## How this works

The system has 3 parts:

1. Your phone or tablet
   You open the launcher page here.
2. Your home server
   This runs the app and is the device that actually pairs with the TV.
3. The LG TV
   The TV receives commands from the home server and opens YouTube or a browser page.

The flow is:

1. You browse to `http://YOUR_SERVER_IP:3000` on your phone.
2. You tap a button such as `Peppa Pig`.
3. The page sends a request to the server.
4. The server sends a control command to the LG TV.
5. The TV changes to the selected content.

Your phone is only the control screen. The phone does not need to be paired with the TV. The server is the paired device.

## What the page can do

The launcher page currently includes:

- `Turn TV On`
- `Open YouTube`
- `Pause`
- `Back`
- `Turn TV Off`
- one button for each cartoon in the config file

The cartoon buttons are controlled by [config/cartoons.json](/Users/micha/Documents/Projects/lg_webos_app/config/cartoons.json#L1).

## Before you start

You need:

- the TV and the home server on the same home network
- the TV IP address
- optionally the TV MAC address if you want `Turn TV On` to work
- `LG Connect Apps` enabled on the TV
- Node.js installed on the home server

## TV setup

Do these steps on the TV first:

1. Turn the TV on.
2. Confirm the TV is connected to the same network as the home server.
3. Open the TV settings.
4. Find the option named `LG Connect Apps`.
5. Turn `LG Connect Apps` on.
6. Leave the TV powered on while you do the first pairing from the server.

The first time the server connects, the TV should show a prompt asking whether to allow the connection. Approve that prompt.

## Home server setup

Follow these steps on the home server.

### 1. Open the project folder

```powershell
cd C:\Users\micha\Documents\Projects\lg_webos_app
```

### 2. Install dependencies

```powershell
npm install
```

### 3. Create the `.env` file

Create a file named `.env` in the project root.

Use [`.env.example`](/Users/micha/Documents/Projects/lg_webos_app/.env.example#L1) as the template.

Example:

```dotenv
PORT=3000
TV_HOST=192.168.1.50
TV_MAC=
TV_KEY_FILE=./data/lgtv-keyfile
CARTOONS_CONFIG=./config/cartoons.json
```

What each value means:

- `PORT`
  The port for the local website. `3000` is fine for most homes.
- `TV_HOST`
  The IP address of the LG TV on your network. This is required.
- `TV_MAC`
  The MAC address of the TV. This is optional, but needed for `Turn TV On`.
- `TV_KEY_FILE`
  Where the pairing key is stored after the first approval. Leave this as-is unless you have a reason to change it.
- `CARTOONS_CONFIG`
  Which JSON file contains the cartoon buttons. Leave this as-is unless you want the config elsewhere.

### 4. Edit the cartoon buttons

Open [config/cartoons.json](/Users/micha/Documents/Projects/lg_webos_app/config/cartoons.json#L1).

Each object in the `actions` list becomes one big button on the launcher page.

Current example:

```json
{
  "id": "bluey",
  "label": "Bluey",
  "description": "Bluey full episodes",
  "type": "youtube",
  "target": "https://www.youtube.com/watch?v=abcd1234",
  "accent": "#6fc5ff"
}
```

Important fields:

- `id`
  Internal ID for the button. Keep it short and unique.
- `label`
  The text shown on the button.
- `description`
  Smaller helper text under the label.
- `type`
  Usually `youtube`. You can also use `browser`.
- `target`
  The video, playlist, or search target.
- `accent`
  Button color accent.

Allowed `target` formats for `type: "youtube"`:

- `v=abcd1234`
- `list=PL1234567890`
- `https://www.youtube.com/watch?v=abcd1234`
- `https://www.youtube.com/playlist?list=PL1234567890`
- plain search text such as `bluey full episodes`

How the app handles each target:

- It first tries to open the YouTube TV app on the LG TV.
- If that does not work on your model, it falls back to opening the content in the TV browser.

### 5. Start the server

```powershell
npm start
```

If it starts correctly, you should see:

```text
Cartoons launcher listening on http://localhost:3000
```

### 6. Open the launcher page

Open this from your phone, tablet, or computer on the same network:

```text
http://YOUR_SERVER_IP:3000
```

Replace `YOUR_SERVER_IP` with the IP address of the home server.

## First pairing with the TV

Do this once after the server is running:

1. Open the launcher page on your phone.
2. Press `Open YouTube` or one of the cartoon buttons.
3. Look at the TV screen.
4. If the TV asks to allow the connection, approve it.
5. After approval, the server stores the pairing key in `data/lgtv-keyfile`.

Usually you only need to do this once.

You may need to pair again if:

- the key file is deleted
- the TV resets its trusted devices
- the TV firmware changes something about pairing

## Day-to-day usage

Once the pairing is done, daily use is simple:

1. Open the launcher page on your phone.
2. Tap the show you want next.
3. The server tells the TV to switch to that content.

Typical examples:

- If she is tired of one cartoon, tap another cartoon button.
- If she is already in YouTube and you want to stop playback, press `Pause`.
- If you need to leave the current screen in the TV app, press `Back`.
- If the TV is idle and you want to shut it down, press `Turn TV Off`.

## What each quick button does

- `Turn TV On`
  Sends a Wake-on-LAN packet to the TV. This only works if `TV_MAC` is set correctly.
- `Open YouTube`
  Opens the YouTube app on the TV.
- `Pause`
  Sends a playback pause command to the TV.
- `Back`
  Sends a remote-style back button command to the TV.
- `Turn TV Off`
  Sends the TV power-off command.
- `Refresh Status`
  Re-checks whether the TV is reachable and which app is active.

## If something does not work

### The page opens, but no TV action works

Check:

1. `TV_HOST` is correct in `.env`
2. the TV is powered on
3. the TV and server are on the same network
4. `LG Connect Apps` is enabled on the TV

### `Turn TV On` does not work

Check:

1. `TV_MAC` is filled in correctly
2. the TV supports waking from the network in your current power settings

If needed, ignore that button. The rest of the app can still work while the TV is already on.

### The TV never shows the pairing prompt

Check:

1. `LG Connect Apps` is turned on
2. the TV is awake and not fully powered down
3. `TV_HOST` is the current IP address of the TV

### A cartoon button opens the wrong content

Edit [config/cartoons.json](/Users/micha/Documents/Projects/lg_webos_app/config/cartoons.json#L1) and replace the `target` with a full YouTube URL instead of a short ID.

### The YouTube app does not open the selected video directly

That can happen on some LG webOS and YouTube app combinations.

In that case:

1. keep using the same button
2. let the app fall back to the TV browser
3. prefer full YouTube URLs in `target`

## Files in this project

- [server.js](/Users/micha/Documents/Projects/lg_webos_app/server.js#L1)
  Express server and API routes.
- [src/lg-tv-client.js](/Users/micha/Documents/Projects/lg_webos_app/src/lg-tv-client.js#L1)
  LG TV control client for pairing, launching apps, media pause, remote back, and power commands.
- [public/index.html](/Users/micha/Documents/Projects/lg_webos_app/public/index.html#L1)
  The launcher page.
- [public/app.js](/Users/micha/Documents/Projects/lg_webos_app/public/app.js#L1)
  Frontend logic for button clicks.
- [public/styles.css](/Users/micha/Documents/Projects/lg_webos_app/public/styles.css#L1)
  Page styling.
- [config/cartoons.json](/Users/micha/Documents/Projects/lg_webos_app/config/cartoons.json#L1)
  The cartoon button list.
- [.env.example](/Users/micha/Documents/Projects/lg_webos_app/.env.example#L1)
  Example environment settings.

## Notes

- The pairing key is stored locally on the server in `data/lgtv-keyfile`.
- If the TV IP changes, update `TV_HOST`.
- If you later want a TV-native webOS app, this launcher is still a good prototype for that.
