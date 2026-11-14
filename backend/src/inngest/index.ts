import { env } from "../env.js";
import { flakyDemo, helloWorld } from "./functions/hello.js";
import { scanRepository } from "./functions/scan-repository.js";
import { syncInstallation } from "./functions/sync-installation.js";

export const functions = [
  scanRepository,
  syncInstallation,
  ...(env.NODE_ENV === "development" ? [helloWorld, flakyDemo] : []),
];
