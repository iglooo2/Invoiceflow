export type SavedEstimateItem = {
  heading: string;
  body: string;
  amount: number | null;
};

export const SAVED_ITEMS_STORAGE_KEY = "invoiceflow-saved-estimate-items";

export const STUDIO_SAVED_ITEMS: SavedEstimateItem[] = [
  {
    heading: "Labor — hourly",
    body: "On-site or shop labor, billed by the hour. Travel time billed separately if the job is outside the usual radius.",
    amount: 85,
  },
  {
    heading: "Materials",
    body: "Parts and consumables for this job. Receipts available on request; unused returns credited.",
    amount: null,
  },
  {
    heading: "Site visit",
    body: "Measure, photos, and a written scope from the jobsite so the price matches the work.",
    amount: 125,
  },
  {
    heading: "Travel",
    body: "Mileage and time to reach the site.",
    amount: 45,
  },
  {
    heading: "Discovery / kickoff",
    body: "Half-day workshop to lock the brief before production starts.",
    amount: 850,
  },
];
