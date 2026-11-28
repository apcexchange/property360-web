import type { GuideCover } from "./types";

export const guidePhotos = {
  apartment: {
    src: "/images/guides/generated/cover-apartment.webp",
    alt: "A sunlit living room with a grey sofa, wooden furniture and houseplants",
  },
  lagos: {
    src: "/images/guides/generated/cover-lagos.webp",
    alt: "An AI-generated cityscape inspired by Lagos, with rooftops, trees and a hazy skyline",
  },
  paperwork: {
    src: "/images/guides/generated/cover-paperwork.webp",
    alt: "Close-up of a person signing paperwork with a black pen at a table",
  },
  budget: {
    src: "/images/guides/generated/cover-budget.webp",
    alt: "A person checking financial paperwork beside a phone calculator and pen",
  },
  keys: {
    src: "/images/guides/generated/cover-keys.webp",
    alt: "A hand holding house keys beside a front door",
  },
  maintenance: {
    src: "/images/guides/generated/cover-maintenance.webp",
    alt: "A plumber working on bathroom pipework with a toolbox nearby",
  },
  payments: {
    src: "/images/guides/generated/cover-payments.webp",
    alt: "A person using a bank card and laptop to make an online payment",
  },
} satisfies Record<string, GuideCover>;
