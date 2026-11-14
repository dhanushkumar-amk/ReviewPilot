import { App, Octokit } from "octokit";
import { env, githubAppPrivateKey } from "../env.js";

/**
 * Shared GitHub App Octokit instance.
 * Installation tokens are managed in memory by Octokit and never persisted or logged.
 */
export const githubApp = new App({
  appId: env.GITHUB_APP_ID,
  privateKey: githubAppPrivateKey,
  oauth: {
    clientId: env.GITHUB_APP_CLIENT_ID,
    clientSecret: env.GITHUB_APP_CLIENT_SECRET,
  },
});

export function createUserOctokit(token: string): Octokit {
  return new Octokit({ auth: token });
}

