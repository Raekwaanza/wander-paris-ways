import type { Interest, InterestId } from "./types";

export const INTERESTS: Interest[] = [
  { id: "architecture", label: "Architecture" },
  { id: "historic", label: "Historic Paris" },
  { id: "hidden", label: "Hidden Gems" },
  { id: "parks", label: "Parks & Gardens" },
  { id: "cafes", label: "Cafés" },
  { id: "bookshops", label: "Bookshops" },
  { id: "art", label: "Art & Galleries" },
  { id: "food", label: "Food" },
  { id: "romantic", label: "Romantic" },
  { id: "quiet", label: "Courtyards & Passages" },
  { id: "local", label: "Local Favorites" },
  { id: "iconic", label: "Iconic Paris" },
];

export const interestLabel = (id: InterestId) =>
  INTERESTS.find((i) => i.id === id)?.label ?? id;
