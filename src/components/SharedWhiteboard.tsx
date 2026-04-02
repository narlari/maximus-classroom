import dynamic from "next/dynamic";

export const SharedWhiteboard = dynamic(
  async () => {
    const module = await import("@/components/SharedWhiteboardClient");
    return module.SharedWhiteboardClient;
  },
  {
    ssr: false,
    loading: () => (
      <section className="flex min-h-[520px] flex-1 items-center justify-center rounded-[2rem] border border-lagoon/10 bg-white text-sm font-semibold text-ink/60">
        Loading whiteboard...
      </section>
    ),
  },
);
