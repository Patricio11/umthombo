import { notFound } from "next/navigation";
import { getAdminPost } from "@/server/db/journal";
import { AdminPageHeader } from "@/components/admin/primitives";
import { PostForm } from "@/components/admin/journal/PostForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit post" };

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getAdminPost(id);
  if (!post) notFound();

  return (
    <>
      <AdminPageHeader title={`Edit “${post.title}”`} subtitle="Update this post." />
      <PostForm post={post} />
    </>
  );
}
