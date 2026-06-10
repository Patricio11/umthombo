import { AdminPageHeader } from "@/components/admin/primitives";
import { PostForm } from "@/components/admin/journal/PostForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "New post" };

export default function NewPostPage() {
  return (
    <>
      <AdminPageHeader title="New post" subtitle="Write a journal entry." />
      <PostForm />
    </>
  );
}
