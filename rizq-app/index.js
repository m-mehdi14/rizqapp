/**
 * Polyfills must load before @solana/web3.js (CLAUDE.md).
 * @format
 */
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";
import { Buffer } from "buffer";

global.Buffer = Buffer;

// Hermes / older RN: Anchor / web3 may expect structuredClone (Safari 17+ API).
if (typeof globalThis.structuredClone !== "function") {
  globalThis.structuredClone = function structuredClonePolyfill(value) {
    return JSON.parse(JSON.stringify(value));
  };
}

import { AppRegistry } from "react-native";
import App from "./src/App";
import { name as appName } from "./app.json";

AppRegistry.registerComponent(appName, () => App);
