import { env } from "../env.js";
import { flakyDemo, helloWorld } from "./functions/hello.js";
import { scanRepository } from "./functions/scan-repository.js";
import { syncInstallation } from "./functions/sync-installation.js";
import { validateFix } from "./functions/validate-fix.js";

export const functions = [
  scanRepository,
  syncInstallation,
  validateFix,
  ...(env.NODE_ENV === "development" ? [helloWorld, flakyDemo] : []),
];
