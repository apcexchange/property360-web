import Image from "next/image";

type GuideIllustrationProps = {
  slug: string;
  variant: number;
  alt: string;
  caption: string;
};

export function GuideIllustration({
  slug,
  variant,
  alt,
  caption,
}: GuideIllustrationProps) {
  return (
    <figure className="my-10 overflow-hidden rounded-2xl border border-foundation-700/10 bg-foundation-700">
      <Image
        src={`/guides/${slug}/illustration?variant=${variant}`}
        alt={alt}
        width={1200}
        height={675}
        sizes="(max-width: 768px) 100vw, 768px"
        className="block aspect-[16/9] w-full object-cover"
      />
      <figcaption className="border-t border-white/10 px-4 py-3 text-[12px] leading-relaxed text-paper/70">
        {caption}
      </figcaption>
    </figure>
  );
}
