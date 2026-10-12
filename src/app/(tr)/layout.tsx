import { rootMetadata, SiteShell } from "@/views/SiteShell";

// Türkçe kök düzen — mevcut adresler (/, /takvim …) değişmedi.
export const metadata = rootMetadata("tr");

export default function Layout({ children }: LayoutProps<"/">) {
  return <SiteShell lang="tr">{children}</SiteShell>;
}
