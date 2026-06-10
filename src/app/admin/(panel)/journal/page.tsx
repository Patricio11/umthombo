import Link from "next/link";
import { Plus } from "lucide-react";
import { getAdminPosts } from "@/server/db/journal";
import { AdminPageHeader } from "@/components/admin/primitives";
import { Button } from "@/components/ui/Button";
import { PostsTable } from "@/components/admin/journal/PostsTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Journal" };

export default async function JournalPage() {
  const posts = await getAdminPosts();
  return (
    <>
      <AdminPageHeader
        title="Journal"
        subtitle="Editorial posts that bring search traffic to the shop."
        action={
          <Link href="/admin/journal/new">
            <Button size="sm">
              <Plus size={16} /> New post
            </Button>
          </Link>
        }
      />
      <PostsTable posts={posts} />
    </>
  );
}
