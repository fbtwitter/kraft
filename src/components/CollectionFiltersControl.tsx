import { useEffect, useRef, useState } from "react";
import SelectField from "../islands/SelectField";

interface Props {
  categories: string[];
}

export default function CollectionFiltersControl({ categories }: Props) {
  const form = useRef<HTMLFormElement>(null);
  const [filters, setFilters] = useState<{
    query: string;
    category: string;
  } | null>(null);

  useEffect(() => {
    const root = form.current!.closest(".listing")!;
    const params = new URLSearchParams(location.search);
    const initial = params.get("category") || params.get("topic") || "";
    const cards = [...root.querySelectorAll<HTMLElement>(".listing-card")];
    const category = categories.includes(initial)
      ? initial
      : cards.find((card) => card.dataset.tags!.split(" ").includes(initial))
          ?.dataset.category || "";
    setFilters({ query: params.get("q") || "", category });
  }, [categories]);

  useEffect(() => {
    if (!filters) return;
    const root = form.current!.closest(".listing")!;
    const text = filters.query.trim().toLowerCase();
    let count = 0;
    for (const card of root.querySelectorAll<HTMLElement>(".listing-card")) {
      card.hidden = !(
        card.dataset.search!.includes(text) &&
        (!filters.category || card.dataset.category === filters.category)
      );
      if (!card.hidden) count++;
    }
    root.querySelector("#experiment-results")!.textContent =
      `${count} ${count === 1 ? "experiment" : "experiments"}`;
    root.querySelector<HTMLElement>("#experiment-empty")!.hidden = count > 0;
    for (const group of root.querySelectorAll<HTMLElement>(".category-group")) {
      group.hidden = !group.querySelector(".listing-card:not([hidden])");
    }
    const url = new URL(location.href);
    text
      ? url.searchParams.set("q", filters.query)
      : url.searchParams.delete("q");
    filters.category
      ? url.searchParams.set("category", filters.category)
      : url.searchParams.delete("category");
    url.searchParams.delete("topic");
    history.replaceState(history.state, "", url);
  }, [filters]);

  return (
    <form
      ref={form}
      className="collection-filters"
      role="search"
      aria-label="Filter experiments"
      onSubmit={(event) => event.preventDefault()}
      onReset={(event) => {
        event.preventDefault();
        setFilters({ query: "", category: "" });
      }}
    >
      <label>
        Find an experiment
        <input
          type="search"
          id="experiment-query"
          placeholder="Search titles, descriptions, or tags"
          value={filters?.query ?? ""}
          onChange={(event) =>
            setFilters({
              query: event.target.value,
              category: filters?.category ?? "",
            })
          }
        />
      </label>
      <label>
        Category
        {filters ? (
          <SelectField
            value={filters.category || "all-topics"}
            aria-label="Category"
            onValueChange={(category) =>
              setFilters({
                ...filters,
                category: category === "all-topics" ? "" : category,
              })
            }
          >
            <option value="all-topics">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </SelectField>
        ) : (
          <select aria-label="Category" defaultValue="">
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        )}
      </label>
      <button type="reset" className="btn ghost">
        Clear filters
      </button>
    </form>
  );
}
