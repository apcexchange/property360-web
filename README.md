This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Google AdSense

The guide article template includes the AdSense script using publisher ID
`pub-6961943244890229`. The publisher declaration is served from `/ads.txt`.
After deploying, verify the site and inspect ad placements and exclusions in
AdSense, including navigation away from an article. AdSense approval and ad
delivery are managed by Google; installing the script does not confer approval.

The cookie notice controls analytics only. Advertising choices are documented
in `/privacy`. Before serving personalised ads to visitors in the EEA, UK or
Switzerland, configure and verify a Google-certified consent management platform
such as Google's European regulations message in AdSense Privacy & messaging.
The local analytics notice is not that CMP, and consent configuration in the
AdSense account cannot be verified from this repository. See
[Google's consent requirements](https://support.google.com/adsense/answer/13554116?hl=en).

Guide revisions retain the original publication date, use a modification date
for substantive changes, label worked figures as illustrative and link sources
with their limits. A specialist review should be credited only after a real,
identified reviewer has completed it. Editorial changes alone do not guarantee
AdSense approval.

## Blog illustrations

The blog uses seventeen AI-generated illustrations created with ChatGPT from
the previous reference photographs. The images are saved as WebP files under
`public/images/guides/generated/`; the exact prompts, reference sources and asset
checksums are recorded in [the generation manifest](docs/blog-images/generated-images.json).
Article captions identify the images as generated, and they do not document
actual properties, people or events.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
