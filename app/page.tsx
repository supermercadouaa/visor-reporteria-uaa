"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

interface CurrentInfo {
  url: string;
  uploadedAt: string;
}

export default function SlideshowPage() {
  return (
    <Suspense fallback={null}>
      <Slideshow />
    </Suspense>
  );
}

function Slideshow() {
  const searchParams = useSearchParams();
  const secondsPerSlide = Number(searchParams.get("seconds")) || 15;
  const pollMinutes = Number(searchParams.get("poll")) || 5;

  const [info, setInfo] = useState<CurrentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<any>(null);

  // Fetch which PDF is currently published, and keep polling for a newer one.
  useEffect(() => {
    let cancelled = false;

    async function fetchCurrent() {
      try {
        const res = await fetch("/api/current", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setError("Todavia no se subio ningun PDF.");
          return;
        }
        const data: CurrentInfo = await res.json();
        if (cancelled) return;
        setError(null);
        setInfo((prev) => {
          if (prev && prev.uploadedAt === data.uploadedAt) return prev;
          setPageIndex(0);
          return data;
        });
      } catch (e) {
        if (!cancelled) setError("Error consultando el PDF actual.");
      }
    }

    fetchCurrent();
    const interval = setInterval(fetchCurrent, pollMinutes * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pollMinutes]);

  // Load the PDF document whenever a new one is published.
  useEffect(() => {
    if (!info) return;
    let cancelled = false;

    async function loadPdf() {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const loadingTask = pdfjsLib.getDocument(
          `${info!.url}?v=${encodeURIComponent(info!.uploadedAt)}`
        );
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
      } catch (e) {
        if (!cancelled) setError("Error abriendo el PDF.");
      }
    }

    loadPdf();
    return () => {
      cancelled = true;
    };
  }, [info]);

  // Render the current page onto the canvas.
  useEffect(() => {
    const pdf = pdfDocRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas || numPages === 0) return;

    let cancelled = false;

    async function render() {
      const page = await pdf.getPage(pageIndex + 1);
      if (cancelled) return;

      const context = canvas!.getContext("2d");
      if (!context) return;

      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(
        window.innerWidth / baseViewport.width,
        window.innerHeight / baseViewport.height
      );
      const viewport = page.getViewport({ scale });

      canvas!.width = viewport.width;
      canvas!.height = viewport.height;

      await page.render({ canvasContext: context, viewport }).promise;
    }

    render();

    const onResize = () => render();
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
    };
  }, [pageIndex, numPages]);

  // Advance slides on a timer, looping back to the first page.
  useEffect(() => {
    if (numPages < 2) return;
    const interval = setInterval(() => {
      setPageIndex((prev) => (prev + 1) % numPages);
    }, secondsPerSlide * 1000);
    return () => clearInterval(interval);
  }, [numPages, secondsPerSlide]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000",
      }}
    >
      {error && (
        <p style={{ color: "#888", fontFamily: "sans-serif" }}>{error}</p>
      )}
      {!error && numPages === 0 && (
        <p style={{ color: "#888", fontFamily: "sans-serif" }}>Cargando...</p>
      )}
      <canvas ref={canvasRef} />
    </div>
  );
}
