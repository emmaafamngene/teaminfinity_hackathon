"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
export function ProductImage({
  src,
  alt,
  large = false,
}: {
  src?: string;
  alt: string;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <Image
      src={!src || failed ? "/product-fallback.svg" : src}
      alt={alt}
      fill
      sizes={
        large
          ? "(max-width: 800px) 100vw, 50vw"
          : "(max-width: 540px) 50vw, (max-width: 1000px) 33vw, 20vw"
      }
      className="object-cover"
      unoptimized={src?.startsWith("blob:")}
      onError={() => setFailed(true)}
    />
  );
}
