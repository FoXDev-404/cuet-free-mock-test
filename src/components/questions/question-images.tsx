/* eslint-disable @next/next/no-img-element */
import {
  imagesForPlacement,
  type QuestionImage,
  type QuestionImagePlacement,
} from "@/lib/question-display";
import { cn } from "@/lib/utils";

/**
 * Student-facing question media. Images are lazy-loaded, constrained to the
 * card width, and always carry alt text. Raw data URLs are allowed only for
 * the raster formats the upload pipeline validates.
 */
export function QuestionImages({
  images,
  placement = "stem",
  className,
  imageClassName,
}: {
  images: unknown;
  placement?: QuestionImagePlacement;
  className?: string;
  imageClassName?: string;
}) {
  const items = imagesForPlacement(images, placement);
  if (!items.length) return null;

  return (
    <div className={cn("my-4 flex flex-wrap gap-3", className)}>
      {items.map((image, index) => (
        <QuestionImageFigure
          key={`${image.url.slice(0, 80)}-${index}`}
          image={image}
          imageClassName={imageClassName}
        />
      ))}
    </div>
  );
}

/**
 * A single validated diagram. Used directly by option rows so an option image
 * gets the same lazy-loading, alt-text and overflow guarantees as stem media.
 */
export function QuestionImageFigure({
  image,
  className,
  imageClassName,
}: {
  image: QuestionImage;
  className?: string;
  imageClassName?: string;
}) {
  return (
    <figure
      className={cn(
        "max-w-full overflow-hidden rounded-xl border border-neutral-200 bg-white p-2 dark:border-neutral-700 dark:bg-neutral-900",
        className,
      )}
    >
      <img
        src={image.url}
        alt={image.alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={cn(
          "mx-auto h-auto max-h-[28rem] w-auto max-w-full object-contain",
          imageClassName,
        )}
      />
      <figcaption className="mt-2 max-w-[42rem] text-center text-xs text-neutral-500 dark:text-neutral-400">
        {image.alt}
      </figcaption>
    </figure>
  );
}
