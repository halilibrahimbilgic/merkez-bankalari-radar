import { NotFoundPage, notFoundMetadata } from "@/views/NotFoundPage";

export const metadata = notFoundMetadata("en");

export default function NotFound() {
  return <NotFoundPage lang="en" />;
}
