import { parseConfiguration, type AppConfig } from './config.js';
import { preparePaths } from './paths.js';

export async function loadConfiguration(env: NodeJS.ProcessEnv = process.env): Promise<AppConfig> {
  return preparePaths(parseConfiguration(env));
}
