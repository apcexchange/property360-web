import type { GuideCover } from "./types";

export const guidePhotos = {
  apartment: {
    src: "/images/guides/apartment-interior.webp",
    alt: "A sunlit living room with a grey sofa, wooden furniture and houseplants",
    photographer: "Patrick Perkins",
    sourceUrl: "https://unsplash.com/photos/3wylDrjxH-E",
  },
  lagos: {
    src: "/images/guides/lagos-neighbourhood.webp",
    alt: "An elevated view of buildings and rooftops in Lagos, Nigeria",
    photographer: "Obinna Okerekeocha",
    sourceUrl: "https://unsplash.com/photos/fGd8paHzN98",
  },
  paperwork: {
    src: "/images/guides/tenancy-paperwork.webp",
    alt: "People reviewing and signing paperwork together at a table",
    photographer: "Scott Graham",
    sourceUrl: "https://unsplash.com/photos/OQMZwNd3ThU",
  },
  budget: {
    src: "/images/guides/rent-budget.webp",
    alt: "A person checking household paperwork beside a calculator and notebook",
    photographer: "Kelly Sikkema",
    sourceUrl: "https://unsplash.com/photos/xoU52jUVUXA",
  },
  keys: {
    src: "/images/guides/house-keys.webp",
    alt: "A hand holding house keys beside a front door",
    photographer: "Maria Ziegler",
    sourceUrl: "https://unsplash.com/photos/jJnZg7vBfMs",
  },
  maintenance: {
    src: "/images/guides/maintenance-plumbing.webp",
    alt: "A plumber working on bathroom pipework with a toolbox nearby",
    photographer: "bhagya laxmi",
    sourceUrl: "https://unsplash.com/photos/jaP5ClBdIyU",
  },
  payments: {
    src: "/images/guides/online-payments.webp",
    alt: "A person using a bank card and laptop to make an online payment",
    photographer: "rupixen",
    sourceUrl: "https://unsplash.com/photos/Q59HmzK38eQ",
  },
} satisfies Record<string, GuideCover>;
