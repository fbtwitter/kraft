import type { CollectionEntry } from "astro:content";

export function createExperimentCatalog(
  entries: readonly CollectionEntry<"experiments">[],
) {
  const experiments = entries
    .filter(({ data }) => !data.draft)
    .sort(
      (a, b) =>
        b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf() ||
        a.data.title.localeCompare(b.data.title, "en", {
          sensitivity: "base",
        }) ||
        a.id.localeCompare(b.id, "en"),
    );
  const featuredExperiments = experiments.filter(({ data }) => data.featured);
  if (featuredExperiments.length > 1) {
    throw new Error("Choose only one featured experiment.");
  }
  const featured = featuredExperiments[0] ?? experiments[0];

  return {
    experiments,
    categories: [
      ...new Set(experiments.map(({ data }) => data.category)),
    ].sort(),
    featured,
    moreExperiments: experiments.filter(({ id }) => id !== featured?.id),
    relatedTo(id: string) {
      const current = experiments.find((experiment) => experiment.id === id);
      return current
        ? experiments
            .filter(
              (experiment) =>
                experiment.id !== id &&
                experiment.data.category === current.data.category,
            )
            .slice(0, 2)
        : [];
    },
  };
}
