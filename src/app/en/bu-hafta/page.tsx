import { redirect } from "next/navigation";

// Paylaşım kartı yalnızca Türkçe; dil değiştiriciden gelen Türkçe sayfaya döner.
export default function Page() {
  redirect("/bu-hafta");
}
