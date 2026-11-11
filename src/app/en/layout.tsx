import { rootMetadata, rootViewport, SiteShell } from "@/views/SiteShell";

// İngilizce kök düzen: /en altındaki her sayfa <html lang="en"> ile gelir.
export const metadata = rootMetadata("en");
export const viewport = rootViewport;

export default function Layout({ children }: LayoutProps<"/en">) {
  return <SiteShell lang="en">{children}</SiteShell>;
}
