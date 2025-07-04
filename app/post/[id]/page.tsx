// Dependencies
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { fetchPostById } from "@/utils/dataTransformer";
import { Database } from "@/types/supabase";

type Post = Database["public"]["Tables"]["posts"]["Row"];

export default function PostPage() {
  const router = useRouter();
  const { id } = router.query;
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || typeof id !== "string") return;

    const loadPost = async () => {
      try {
        setLoading(true);
        const postData = await fetchPostById(id);

        if (!postData) {
          setError("Post not found");
        } else {
          setPost(postData);
        }
      } catch (err) {
        setError("Failed to load post");
        console.error("Error loading post:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [id]);

  return <>{post && <h1>{post.title}</h1>}</>;
}
