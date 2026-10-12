import { rootMetadata, SiteShell } from "@/views/SiteShell";

// İngilizce kök düzen: /en altındaki her sayfa <html lang="en"> ile gelir.
export const metadata = rootMetadata("en");

export default function Layout({ children }: LayoutProps<"/en">) {
  return <SiteShell lang="en">{children}</SiteShell>;
}
