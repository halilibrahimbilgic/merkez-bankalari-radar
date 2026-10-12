import { ContactPage, contactMetadata } from "@/views/ContactPage";

export const metadata = contactMetadata("en");

export default function Page() {
  return <ContactPage lang="en" />;
}
