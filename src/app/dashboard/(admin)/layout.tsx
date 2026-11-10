import { CaseFileShell } from "@/app/ui/case-file-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <CaseFileShell>{children}</CaseFileShell>;
}
