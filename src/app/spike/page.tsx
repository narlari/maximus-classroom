import dynamic from "next/dynamic";

// tldraw requires client-side only — no SSR
const TldrawSpike = dynamic(
  () => import("@/components/whiteboard-spike/TldrawSpike").then((m) => m.TldrawSpike),
  { ssr: false, loading: () => <div className="flex h-screen items-center justify-center bg-gray-950 text-white">Loading whiteboard...</div> }
);

export default function SpikePage() {
  return <TldrawSpike />;
}
