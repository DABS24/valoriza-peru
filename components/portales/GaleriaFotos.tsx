"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";

import { cn } from "@/lib/cn";
import { COPY } from "@/lib/copy";

export interface FotoGaleria {
  id: string;
  url: string | null;
}

/**
 * Galería de fotos de la ficha: imagen principal + tira de miniaturas. Las URLs
 * son firmadas de corta duración (generadas server-side); se usa <img> plano por
 * lo mismo que en FileDropzone (next/image no aporta a un signed URL temporal).
 */
export function GaleriaFotos({ fotos, alt }: { fotos: FotoGaleria[]; alt: string }) {
  const validas = fotos.filter((f) => f.url);
  const [activa, setActiva] = useState(0);

  if (validas.length === 0) {
    return (
      <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-portal border border-portal-line bg-portal-subtle text-portal-muted">
        <ImageOff className="size-8" aria-hidden />
        <span className="text-sm font-medium">{COPY.portales.card.sinFoto}</span>
      </div>
    );
  }

  const idx = Math.min(activa, validas.length - 1);

  return (
    <div>
      {/* Caja con aspecto FIJO (como las cards, que sí cargan): garantiza que el
          <img> tenga dimensiones aunque aún no se conozca el tamaño intrínseco de
          la URL firmada. object-contain para no recortar la foto. */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-portal border border-portal-line bg-portal-subtle">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          loading="lazy"
          decoding="async"
          src={validas[idx].url!}
          alt={alt}
          className="absolute inset-0 size-full object-contain"
        />
      </div>
      {validas.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {validas.map((f, i) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiva(i)}
              className={cn(
                "size-16 shrink-0 overflow-hidden rounded-portal-sm border-2 transition",
                i === idx
                  ? "border-portal-primary"
                  : "border-portal-line hover:border-portal-primary/50",
              )}
              aria-label={`${alt} ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                loading="lazy"
                decoding="async"
                src={f.url!}
                alt=""
                className="size-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
