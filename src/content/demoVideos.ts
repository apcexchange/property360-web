export type DemoVideo = {
  /** YouTube video id (the part after `watch?v=` or `youtu.be/`). */
  id: string;
  title: string;
  description: string;
};

export type DemoRole = {
  key: string;
  label: string;
  blurb: string;
  videos: DemoVideo[];
};

// Sample video reused across roles for now — swap each `id` for the real
// walkthrough when it's recorded. Add more entries to a role's `videos` array
// to render a grid of videos instead of a single player. This is the only file
// you need to touch to update the /demo page content.
const SAMPLE_ID = "jRnIUjQxVlk";

export const DEMO_ROLES: DemoRole[] = [
  {
    key: "landlords",
    label: "Landlords",
    blurb:
      "Collect rent online, automate invoices and receipts, and manage leases and maintenance from one place.",
    videos: [
      {
        id: SAMPLE_ID,
        title: "Property360 for landlords",
        description:
          "Add a property, onboard a tenant, collect rent with Paystack, and issue receipts automatically.",
      },
    ],
  },
  {
    key: "agencies",
    label: "Agencies",
    blurb:
      "Manage your clients' properties at scale, with per-property permissions for every agent on your team.",
    videos: [
      {
        id: SAMPLE_ID,
        title: "Property360 for agencies & agents",
        description:
          "Manage multiple landlords, record payments, renew leases, and keep every portfolio in one place.",
      },
    ],
  },
  {
    key: "tenants",
    label: "Tenants",
    blurb:
      "Pay rent, keep every receipt, submit maintenance requests, and chat your landlord or agent.",
    videos: [
      {
        id: SAMPLE_ID,
        title: "Property360 for tenants",
        description:
          "Pay rent online, track receipts, raise maintenance requests, and stay in touch with your landlord.",
      },
    ],
  },
];
