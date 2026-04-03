import { notFound } from "next/navigation";
import { VoiceSession } from "@/components/VoiceSession";
import { getStudentProfile } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function ClassroomPage({
  params,
}: {
  params: { studentId: string };
}) {
  const profile = getStudentProfile(params.studentId);

  if (!profile) {
    notFound();
  }

  return (
    <main
      data-classroom-layout="true"
      className="classroom-page h-screen overflow-hidden bg-[#060b16] text-white"
    >
      <VoiceSession student={profile.student} />
    </main>
  );
}
