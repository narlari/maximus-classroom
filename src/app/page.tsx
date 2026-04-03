import { listStudents } from "@/lib/db";
import { StudentSelectClient } from "@/components/StudentSelectClient";

export const dynamic = "force-dynamic";

export default function Home() {
  const students = listStudents();

  return <StudentSelectClient students={students} />;
}
