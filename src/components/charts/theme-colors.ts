"use client";

import { useEffect, useMemo, useState } from "react";

type RgbTriplet = [number, number, number];

function parseRgbTriplet(raw: string): RgbTriplet | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length < 3) return null;

  const r = Number(parts[0]);
  const g = Number(parts[1]);
  const b = Number(parts[2]);
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null;

  return [r, g, b];
}

function rgbaFromTriplet(triplet: RgbTriplet, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${triplet[0]}, ${triplet[1]}, ${triplet[2]}, ${a})`;
}

function desaturate(triplet: RgbTriplet, amount: number): RgbTriplet {
  const gray = 0.299 * triplet[0] + 0.587 * triplet[1] + 0.114 * triplet[2];
  return [
    Math.round(triplet[0] + (gray - triplet[0]) * amount),
    Math.round(triplet[1] + (gray - triplet[1]) * amount),
    Math.round(triplet[2] + (gray - triplet[2]) * amount),
  ];
}

function lighten(triplet: RgbTriplet, amount: number): RgbTriplet {
  return [
    Math.round(triplet[0] + (255 - triplet[0]) * amount),
    Math.round(triplet[1] + (255 - triplet[1]) * amount),
    Math.round(triplet[2] + (255 - triplet[2]) * amount),
  ];
}

function soften(triplet: RgbTriplet, desaturateAmount: number, lightenAmount: number): RgbTriplet {
  return lighten(desaturate(triplet, desaturateAmount), lightenAmount);
}

function rotateHue(triplet: RgbTriplet, degrees: number): RgbTriplet {
  const r = triplet[0] / 255;
  const g = triplet[1] / 255;
  const b = triplet[2] / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  h = (h + degrees / 360 + 1) % 1;
  s = s * 0.5;

  const hue2rgb = (p: number, q: number, t: number): number => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  if (s === 0) {
    const gray = Math.round(l * 255);
    return [gray, gray, gray];
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

export function resolveCssVarToRgba(varName: string, alpha = 1): string | null {
  if (typeof document === "undefined") return null;

  const value = getComputedStyle(document.documentElement).getPropertyValue(varName);
  const triplet = parseRgbTriplet(value);
  if (!triplet) return null;

  return rgbaFromTriplet(triplet, alpha);
}

function resolveCssVarToTriplet(varName: string): RgbTriplet | null {
  if (typeof document === "undefined") return null;

  const value = getComputedStyle(document.documentElement).getPropertyValue(varName);
  return parseRgbTriplet(value);
}

export function useThemeColorTick(): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const el = document.documentElement;

    const obs = new MutationObserver(() => setTick((t) => t + 1));
    obs.observe(el, {
      attributes: true,
      attributeFilter: ["class", "data-accent"],
    });

    return () => obs.disconnect();
  }, []);

  return tick;
}

export function useResolvedThemeColors() {
  const tick = useThemeColorTick();

  return useMemo(() => {
    const accentTriplet = resolveCssVarToTriplet("--accent-primary");

    const generatePalette = (): string[] => {
      if (!accentTriplet) {
        return [
          "rgba(156, 163, 205, 0.75)",
          "rgba(147, 160, 195, 0.7)",
          "rgba(160, 155, 190, 0.7)",
          "rgba(140, 170, 190, 0.65)",
          "rgba(155, 175, 180, 0.65)",
          "rgba(165, 155, 175, 0.6)",
        ];
      }

      const base = soften(accentTriplet, 0.35, 0.25);
      const hueShifts = [0, 35, -35, 70, -70, 105];

      return hueShifts.map((shift, index) => {
        const rotated = rotateHue(base, shift);
        const lightened = lighten(rotated, 0.15 + index * 0.02);
        const alpha = 0.7 - index * 0.015;
        return rgbaFromTriplet(lightened, alpha);
      });
    };

    const palette = generatePalette();

    const successTriplet: RgbTriplet = resolveCssVarToTriplet("--success") ?? [74, 222, 128];
    const warningTriplet: RgbTriplet = resolveCssVarToTriplet("--warning") ?? [251, 191, 36];
    const infoTriplet: RgbTriplet = resolveCssVarToTriplet("--info") ?? [96, 165, 250];
    const errorTriplet: RgbTriplet = resolveCssVarToTriplet("--error") ?? [248, 113, 113];

    const softSuccess = soften(successTriplet, 0.4, 0.3);
    const softWarning = soften(warningTriplet, 0.4, 0.25);
    const softInfo = soften(infoTriplet, 0.35, 0.3);
    const softError = soften(errorTriplet, 0.45, 0.3);

    return {
      palette,
      other: "rgba(165, 170, 185, 0.5)",
      remaining: "rgba(190, 195, 205, 0.4)",
      border: "rgba(170, 175, 190, 0.25)",
      success: rgbaFromTriplet(softSuccess, 0.7),
      warning: rgbaFromTriplet(softWarning, 0.65),
      info: rgbaFromTriplet(softInfo, 0.65),
      error: rgbaFromTriplet(softError, 0.6),
      fgPrimary: resolveCssVarToRgba("--fg-primary", 1) ?? "rgba(15, 23, 42, 1)",
      bgOverlay: resolveCssVarToRgba("--bg-overlay", 0.96) ?? "rgba(255, 255, 255, 0.96)",
    };
  }, [tick]);
}