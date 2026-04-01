import { VoiceSession } from "@/components/VoiceSession";

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col justify-between overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 shadow-bubble backdrop-blur">
        <section className="relative overflow-hidden px-5 pb-6 pt-8 sm:px-8 sm:pt-10">
          <div className="absolute right-[-4rem] top-[-4rem] h-36 w-36 rounded-full bg-mango/50 blur-2xl" />
          <div className="absolute bottom-[-2rem] left-[-2rem] h-32 w-32 rounded-full bg-coral/30 blur-2xl" />
          <div className="relative">
            <div className="inline-flex items-center rounded-full bg-lagoon/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-lagoon">
              Maximus Classroom
            </div>
            <h1 className="mt-4 max-w-xl text-4xl font-black leading-tight text-ink sm:text-5xl">
              Voice math tutoring made for kids.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-ink/75 sm:text-lg">
              Tap the big mic, say your math question, and talk to Maximus in real time.
            </p>
          </div>
        </section>
        <VoiceSession />
      </div>
    </main>
  );
}
