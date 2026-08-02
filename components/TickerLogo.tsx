"use client";

import { useEffect, useRef, useState } from "react";

type Plate = "light" | "dark";

/**
 * Vibrant native-color company marks.
 * Light white plate by default (colors pop). If the mark is mostly white,
 * auto-switch to a dark plate so it stays visible — without recoloring the logo.
 */
export default function TickerLogo({
  symbol,
  size = 28,
  className = "",
  priority = false,
  ring = false,
}: {
  symbol: string;
  size?: number;
  className?: string;
  priority?: boolean;
  ring?: boolean;
}) {
  const ticker = symbol.toUpperCase();
  const staticSrc = `/logos/${ticker}.png`;
  const apiSrc = `/api/logo/${encodeURIComponent(ticker)}`;
  const [src, setSrc] = useState(`${staticSrc}?v=native`);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [plate, setPlate] = useState<Plate>("light");
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setSrc(`${staticSrc}?v=native`);
    setFailed(false);
    setLoaded(false);
    setPlate("light");
  }, [ticker, staticSrc]);

  useEffect(() => {
    const el = imgRef.current;
    if (el?.complete && el.naturalWidth > 0) {
      setLoaded(true);
      detectPlate(el);
    }
  }, [src]);

  function detectPlate(img: HTMLImageElement) {
    try {
      const w = Math.min(64, img.naturalWidth || 64);
      const h = Math.min(64, img.naturalHeight || 64);
      if (!w || !h) return;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      const { data } = ctx.getImageData(0, 0, w, h);
      let opaque = 0;
      let bright = 0;
      let lumSum = 0;
      for (let i = 0; i < data.length; i += 16) {
        const a = data[i + 3];
        if (a < 40) continue;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        opaque += 1;
        lumSum += lum;
        if (lum > 220) bright += 1;
      }
      if (!opaque) return;
      const avg = lumSum / opaque;
      const brightRatio = bright / opaque;
      // Mostly white / light wordmark → dark plate; otherwise keep light for color pop.
      setPlate(brightRatio > 0.7 || avg > 225 ? "dark" : "light");
    } catch {
      // cross-origin / tainted — keep light plate
    }
  }

  if (failed) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-terminal-accent/35 to-[#1a120c] text-[11px] font-black tracking-wide text-terminal-accent ring-1 ring-terminal-accent/45 ${className}`}
        style={{ width: size, height: size }}
        aria-hidden
        title={ticker}
      >
        {ticker.slice(0, 2)}
      </span>
    );
  }

  const plateClass =
    plate === "dark"
      ? "bg-[#141414] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]"
      : "bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]";

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl ${plateClass} ${
        ring
          ? "ring-2 ring-terminal-accent shadow-[0_0_18px_rgba(249,115,22,0.45)]"
          : ""
      } ${className}`}
      style={{ width: size, height: size }}
    >
      {!loaded ? (
        <span
          className="absolute inset-0 animate-pulse bg-neutral-200"
          aria-hidden
        />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={`${ticker} logo`}
        width={size}
        height={size}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={`relative z-[1] h-full w-full object-contain p-[12%] transition-opacity duration-200 ${
          loaded ? "opacity-100" : "opacity-90"
        }`}
        onLoad={(e) => {
          setLoaded(true);
          detectPlate(e.currentTarget);
        }}
        onError={() => {
          if (src.includes("/logos/")) {
            setLoaded(false);
            setSrc(apiSrc);
            return;
          }
          setFailed(true);
        }}
      />
    </span>
  );
}
