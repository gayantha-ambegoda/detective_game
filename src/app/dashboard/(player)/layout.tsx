import { CaseFileShell } from "@/app/ui/case-file-shell";

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return <CaseFileShell>{children}</CaseFileShell>;
}
