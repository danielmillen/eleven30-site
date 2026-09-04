import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

export type AppEntry = CollectionEntry<'apps'>;
export type PolicyEntry = CollectionEntry<'policies'>;

/** Apps in display order: `order` ascending, then `name` ascending. */
export async function getApps(): Promise<AppEntry[]> {
  const apps = await getCollection('apps');
  return apps.sort((a, b) => {
    if (a.data.order !== b.data.order) return a.data.order - b.data.order;
    return a.data.name.localeCompare(b.data.name);
  });
}

/** Throws with the offending file path when the policy is missing or mislabelled. */
export async function getPolicyForApp(app: AppEntry): Promise<PolicyEntry> {
  const policy = await getEntry('policies', app.id);
  if (!policy) {
    throw new Error(
      `App "${app.id}" (src/content/apps/${app.id}.md) has no policy at src/content/policies/${app.id}.md`
    );
  }
  if (policy.data.appSlug !== policy.id) {
    throw new Error(
      `Policy src/content/policies/${policy.id}.md declares appSlug "${policy.data.appSlug}" but its filename id is "${policy.id}"`
    );
  }
  return policy;
}

/** Both directions. Called from /apps/ and from the privacy route's getStaticPaths. */
export async function assertPolicyCoverage(): Promise<void> {
  const apps = await getApps();
  for (const app of apps) {
    await getPolicyForApp(app);
  }

  const policies = await getCollection('policies');
  const appIds = new Set(apps.map((app) => app.id));
  for (const policy of policies) {
    if (!appIds.has(policy.id)) {
      throw new Error(
        `Policy src/content/policies/${policy.id}.md has no matching app at src/content/apps/${policy.id}.md`
      );
    }
  }
}
