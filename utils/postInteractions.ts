import { supabase } from "@/utils/supabase";
import { Database } from '../types/supabase';

type Post = Database['public']['Tables']['posts']['Row'];

export type PostWithInteractions = Database["public"]["Tables"]["posts"]["Row"] & {
  likes: { id: string; user_id: string }[];
  comments: { id: string; content: string; created_at: string | null }[];
  profiles: Database["public"]["Tables"]["profiles"]["Row"] | null;
};

// Get all unique types from posts
export function extractTypesFromPosts(posts: Post[]): string[] {
  const typesSet = new Set<string>();
  
  posts.forEach(post => {
    if (post.types) {
      post.types.forEach(type => typesSet.add(type));
    }
  });

  return Array.from(typesSet).sort();
}

export async function fetchPostById(postId: string): Promise<Post | null> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single(); // Use .single() since we're fetching one post

    if (error) {
      console.error('Error fetching post:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      title: data.title,
      description: data.description ?? null,
      types: data.types ?? [],
      cover_image_url: data.cover_image_url ?? "",
      _url: data._url,
      parent_id: data.parent_id ?? "",
      child_id: data.child_id ?? "",
      user_id: data.user_id ?? null,
      created_at: data.created_at ?? null,
      duration: data.duration ?? null,
      is_remix: data.is_remix ?? null,
      parent_post_id: data.parent_post_id ?? null,
      updated_at: data.updated_at ?? null,
    };

  } catch (error) {
    console.error('Error in fetchPostById:', error);
    return null;
  }
}

export async function toggleLike(postId: string, userId: string) {
  try {
    // Check if user already liked the post
    const { data: existingLike, error: checkError } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingLike) {
      // Unlike the post
      const { error: deleteError } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;
      return { liked: false };
    } else {
      // Like the post
      const { error: insertError } = await supabase
        .from('likes')
        .insert({ post_id: postId, user_id: userId });

      if (insertError) throw insertError;
      return { liked: true };
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    throw error;
  }
}

export async function addComment(postId: string, userId: string, content: string) {
  try {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content: content.trim()
      })
      .select(`
        id,
        content,
        created_at,
        profiles:user_id (
          id,
          username,
          name,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
}

export async function getPostWithInteractions(postId: string): Promise<PostWithInteractions | null> {
  try {
    // First get the post with likes and comments
    const { data: postData, error: postError } = await supabase
      .from("posts")
      .select(`
        *,
        likes (
          id,
          user_id
        ),
        comments (
          id,
          content,
          created_at
        )
      `)
      .eq("id", postId)
      .single();

    if (postError || !postData) {
      console.error("Error fetching post:", postError);
      return null;
    }
    
    // Then fetch the profile separately using the post's user_id
    let profileData = null;
    if (postData.user_id) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", postData.user_id)
        .single();
      
      if (!profileError) {
        profileData = profile;
      }
    }
    
    // Construct the full response
    const postWithInteractions: PostWithInteractions = {
      ...postData,
      likes: postData.likes || [],
      comments: postData.comments || [],
      profiles: profileData
    };

    return postWithInteractions;
  } catch (error) {
    console.error("Error in getPostWithInteractions:", error);
    return null;
  }
}


export async function checkUserLikedPost(postId: string, userId: string) {
  try {
    const { data, error } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking if user liked post:', error);
    return false;
  }
}