import assert from "node:assert/strict";
import type { CollectionEntry } from "astro:content";
import { createExperimentCatalog } from "../src/lib/experiment-catalog";

function experiment(
  id: string,
  data: Partial<CollectionEntry<"experiments">["data"]> = {},
): CollectionEntry<"experiments"> {
  return {
    id,
    collection: "experiments",
    data: {
      title: id,
      description: "Sample Experiment",
      publishedAt: new Date("2026-11-14"),
      category: "Forms & input",
      tags: [],
      draft: false,
      featured: false,
      usesKraftFonts: false,
      ...data,
    },
  };
}

const entries = [
  experiment("zebra"),
  experiment("draft", { draft: true, featured: true }),
  experiment("older", { publishedAt: new Date("2026-11-13"), featured: true }),
  experiment("beta"),
  experiment("alpha"),
  experiment("other", { category: "Browser capabilities" }),
];
const before = [...entries];
const catalog = createExperimentCatalog(entries);
assert.deepEqual(
  catalog.experiments.map(({ id }) => id),
  ["alpha", "beta", "other", "zebra", "older"],
);
assert.deepEqual(entries, before, "input order stays intact");
assert.equal(
  catalog.featured?.id,
  "older",
  "explicit selection wins over date",
);
assert.deepEqual(
  catalog.moreExperiments.map(({ id }) => id),
  ["alpha", "beta", "other", "zebra"],
);
assert.deepEqual(catalog.categories, ["Browser capabilities", "Forms & input"]);
assert.deepEqual(
  catalog.relatedTo("alpha").map(({ id }) => id),
  ["beta", "zebra"],
);
assert.deepEqual(catalog.relatedTo("other"), []);
assert.deepEqual(catalog.relatedTo("draft"), []);
assert.deepEqual(catalog.relatedTo("unknown"), []);
assert.equal(
  createExperimentCatalog([experiment("only")]).featured?.id,
  "only",
);
assert.deepEqual(
  createExperimentCatalog([experiment("only")]).relatedTo("only"),
  [],
);
assert.equal(
  createExperimentCatalog([experiment("z"), experiment("a")]).featured?.id,
  "a",
);
assert.equal(createExperimentCatalog([]).featured, undefined);
assert.deepEqual(createExperimentCatalog([]).experiments, []);
assert.deepEqual(createExperimentCatalog([]).categories, []);
assert.deepEqual(createExperimentCatalog([]).moreExperiments, []);
assert.deepEqual(
  createExperimentCatalog([experiment("hidden", { draft: true })]).experiments,
  [],
);
assert.throws(
  () =>
    createExperimentCatalog([
      experiment("a", { featured: true }),
      experiment("b", { featured: true }),
    ]),
  /Choose only one featured experiment/,
);
assert.deepEqual(
  createExperimentCatalog([
    experiment("z", { title: "Same" }),
    experiment("a", { title: "Same" }),
  ]).experiments.map(({ id }) => id),
  ["a", "z"],
);
console.log("Experiment publication checks passed.");
