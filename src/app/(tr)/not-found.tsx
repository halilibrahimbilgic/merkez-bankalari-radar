import { NotFoundPage, notFoundMetadata } from "@/views/NotFoundPage";

export const metadata = notFoundMetadata("tr");

export default function NotFound() {
  return <NotFoundPage lang="tr" />;
}
