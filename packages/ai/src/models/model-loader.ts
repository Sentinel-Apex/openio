import { getLogger } from '@openio/shared';
import { providerManager } from '../providers/provider-manager.js';
import { modelRegistry } from './registry.js';

export interface ModelLoadOptions {
  providers?: string[];
  refresh?: boolean;
}

export async function loadModels(opts: ModelLoadOptions = {}): Promise<void> {
  const { providers, refresh = false } = opts;

  if (refresh) modelRegistry.clear();

  const targets = providers ?? providerManager.listProviders();

  for (const id of targets) {
    try {
      if (!providerManager.hasProvider(id)) continue;
      const provider = providerManager.getProvider(id);
      const models = await provider.getModels();
      modelRegistry.registerMany(models);
      getLogger().info({ provider: id, count: models.length }, 'Models loaded');
    } catch (err) {
      getLogger().warn({ provider: id }, `Failed to load models: ${(err as Error).message}`);
    }
  }

  getLogger().info({ total: modelRegistry.size }, 'Model loading complete');
}

export function getDefaultModel(provider?: string): string {
  if (provider) {
    const models = modelRegistry.getByProvider(provider);
    if (models.length > 0) return models[0].id;
  }
  return 'gpt-4o';
}
