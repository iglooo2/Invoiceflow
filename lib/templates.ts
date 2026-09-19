export type InvoiceTemplatePayload = {
  notes?: string;
  taxRate?: number;
  dueInDays?: number;
  items: { description: string; quantity: number; rate: number }[];
};

export type ProposalTemplatePayload = {
  title: string;
  notes?: string;
  validForDays?: number;
  sections: { heading: string; body: string; amount?: number | null }[];
};

export const SEED_TEMPLATES = [
  {
    slug: "design-project-invoice",
    name: "Design Project Invoice",
    kind: "invoice" as const,
    description: "Brand identity or campaign work with discovery, system, and delivery line items.",
    payload: {
      taxRate: 0,
      dueInDays: 14,
      notes:
        "50% due to start, remainder on delivery. Source files transfer after the balance clears. Late invoices accrue 1.5%/month.",
      items: [
        { description: "Brand discovery workshop (half-day)", quantity: 1, rate: 850 },
        { description: "Visual identity system", quantity: 1, rate: 2400 },
        { description: "Logo suite — primary, mark, wordmark", quantity: 1, rate: 1200 },
        { description: "Brand guidelines (PDF)", quantity: 1, rate: 600 },
      ],
    } satisfies InvoiceTemplatePayload,
  },
  {
    slug: "retainer-invoice",
    name: "Retainer Invoice",
    kind: "invoice" as const,
    description: "Monthly studio retainer with hours plus async art direction.",
    payload: {
      taxRate: 0,
      dueInDays: 7,
      notes: "Unused hours do not roll over. Please pay by the 5th so we can lock next month’s calendar.",
      items: [
        { description: "Monthly design retainer — 12 hours", quantity: 12, rate: 125 },
        { description: "Slack / async art direction", quantity: 1, rate: 200 },
      ],
    } satisfies InvoiceTemplatePayload,
  },
  {
    slug: "video-edit-proposal",
    name: "Video Edit Proposal",
    kind: "proposal" as const,
    description: "A tight edit estimate for a brand film, reel, or YouTube package.",
    payload: {
      title: "Picture edit & sound pass",
      validForDays: 21,
      notes: "Kickoff within 5 business days of acceptance. Two revision rounds included.",
      sections: [
        {
          heading: "The cut",
          body: "A picture lock that respects your footage and the brief — pacing, selects, lower-thirds, and a color-consistent timeline you can actually hand to a colorist.",
          amount: null,
        },
        {
          heading: "Deliverables",
          body: "Master ProRes (or H.264), social crops (9:16 and 1:1), caption file, and a project archive. Two rounds of notes, then lock.",
          amount: null,
        },
        {
          heading: "Investment",
          body: "Includes assembly, fine cut, basic sound design, and music supervision from your licensed library (or Epidemic).",
          amount: 3200,
        },
      ],
    } satisfies ProposalTemplatePayload,
  },
  {
    slug: "job-estimate",
    name: "Job Estimate",
    kind: "proposal" as const,
    description: "Itemized pricing for a jobsite visit — labor, materials, and a clear total.",
    payload: {
      title: "Job estimate",
      validForDays: 14,
      notes: "Price holds for 14 days. Materials billed as used. Two site visits included.",
      sections: [
        {
          heading: "Site visit & scope",
          body: "Walk the job, take measurements and photos, and write a scope you can stand behind before anyone orders materials.",
          amount: 125,
        },
        {
          heading: "Labor",
          body: "Crew time to complete the work described above, including a clean jobsite at the end of each day.",
          amount: 1800,
        },
        {
          heading: "Materials allowance",
          body: "Estimated parts and consumables. Unused returns credited; overages approved before we buy.",
          amount: 640,
        },
      ],
    } satisfies ProposalTemplatePayload,
  },
];
