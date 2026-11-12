import AdminApp from "@/components/admin/AdminApp";

// Everything on this page comes from the browser after sign-in; nothing is rendered for search engines.
export const dynamic = "force-static";

export default function AdminPage() {
  return <AdminApp />;
}
