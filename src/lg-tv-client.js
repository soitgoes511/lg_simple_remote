const fs = require("fs");
const path = require("path");

const lgtv2 = require("lgtv2");
const wol = require("wol");

function createTvClient({ host, mac, keyFile }) {
  if (!host) {
    return createUnconfiguredClient();
  }

  return new LGTVClient({ host, mac, keyFile });
}

class LGTVClient {
  constructor({ host, mac, keyFile }) {
    this.host = host;
    this.mac = mac;
    this.keyFile = keyFile;
    this.client = null;
    this.connectPromise = null;
    this.connected = false;
  }

  async ensureConnected() {
    if (this.connected && this.client) {
      return this.client;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    fs.mkdirSync(path.dirname(this.keyFile), { recursive: true });

    this.client = lgtv2({
      url: `ws://${this.host}:3000`,
      timeout: 15000,
      reconnect: 5000,
      keyFile: this.keyFile
    });

    this.client.on("close", () => {
      this.connected = false;
    });

    this.connectPromise = new Promise((resolve, reject) => {
      const cleanup = () => {
        this.client.off("connect", onConnect);
        this.client.off("error", onError);
      };

      const onConnect = () => {
        cleanup();
        this.connected = true;
        this.connectPromise = null;
        resolve(this.client);
      };

      const onError = (error) => {
        cleanup();
        this.connected = false;
        this.connectPromise = null;
        reject(error);
      };

      this.client.once("connect", onConnect);
      this.client.once("error", onError);
    });

    return this.connectPromise;
  }

  async request(uri, payload) {
    const client = await this.ensureConnected();

    return new Promise((resolve, reject) => {
      const callback = (error, response) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(response);
      };

      if (payload === undefined) {
        client.request(uri, callback);
        return;
      }

      client.request(uri, payload, callback);
    });
  }

  async launchApp(appId, params = {}) {
    return this.request("ssap://system.launcher/launch", {
      id: appId,
      params
    });
  }

  async openBrowser(target) {
    return this.request("ssap://system.launcher/open", {
      target,
      id: "com.webos.app.browser"
    });
  }

  async getForegroundAppInfo() {
    return this.request("ssap://com.webos.applicationManager/getForegroundAppInfo");
  }

  async pause() {
    return this.request("ssap://media.controls/pause");
  }

  async toast(message) {
    return this.request("ssap://system.notifications/createToast", {
      message
    });
  }

  async sendButton(buttonName) {
    const client = await this.ensureConnected();

    return new Promise((resolve, reject) => {
      client.getSocket(
        "ssap://com.webos.service.networkinput/getPointerInputSocket",
        (error, socket) => {
          if (error) {
            reject(error);
            return;
          }

          socket.send("button", {
            name: String(buttonName).toUpperCase()
          });

          resolve({
            sent: true,
            button: String(buttonName).toUpperCase()
          });
        }
      );
    });
  }

  async powerOn() {
    if (!this.mac) {
      throw new Error("TV_MAC is not set. Add the TV MAC address to use power on.");
    }

    return new Promise((resolve, reject) => {
      wol.wake(this.mac, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          sent: true
        });
      });
    });
  }

  async powerOff() {
    return this.request("ssap://system/turnOff");
  }
}

function createUnconfiguredClient() {
  const message =
    "TV_HOST is not configured yet. Add the TV IP address to the .env file.";

  return {
    async launchApp() {
      throw new Error(message);
    },
    async openBrowser() {
      throw new Error(message);
    },
    async getForegroundAppInfo() {
      throw new Error(message);
    },
    async toast() {
      throw new Error(message);
    },
    async pause() {
      throw new Error(message);
    },
    async sendButton() {
      throw new Error(message);
    },
    async powerOn() {
      throw new Error(message);
    },
    async powerOff() {
      throw new Error(message);
    }
  };
}

module.exports = {
  createTvClient
};
