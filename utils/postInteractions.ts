import { supabase } from "@/utils/supabase";
import { Database } from '../types/supabase';
import { createSignedAudioUrl } from '@/utils/audioService';

type Post = Database['public']['Tables']['posts']['Row'];

export type PostWithInteractions = Database["public"]["Tables"]["posts"]["Row"] & {
  likes: { id: string; user_id: string }[];
  comments: { 
    id: string; 
    content: string; 
    created_at: string | null;
    user_id: string | null;
    parent_comment_id: string | null;
  }[];
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
      children_ids: data.children_ids ?? [""],
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

export async function addComment(postId: string, userId: string, content: string, parentCommentId?: string | null) {
  try {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content: content.trim(),
        parent_comment_id: parentCommentId || null
      })
      .select(`
        id,
        content,
        created_at,
        parent_comment_id
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
          created_at,
          user_id,
          parent_comment_id
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

export async function getPostChildren(postId: string): Promise<PostWithInteractions[]> {
  try {
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        likes(*),
        comments(*)
      `)
      .eq('parent_post_id', postId);

    if (error) {
      console.error('Error fetching post children:', error);
      return [];
    }

    // Map posts to include the 'profiles' property
    if (!posts) return [];
    const postsWithProfiles: PostWithInteractions[] = await Promise.all(
      posts.map(async (post: any) => {
        let profileData = null;
        if (post.user_id) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", post.user_id)
            .single();
          if (!profileError) {
            profileData = profile;
          }
        }
        return {
          ...post,
          likes: post.likes || [],
          comments: post.comments || [],
          profiles: profileData
        };
      })
    );
    return postsWithProfiles;
  } catch (error) {
    console.error('Error in getPostChildren:', error);
    return [];
  }
}

// Function to get the full family tree of a post (parents and children)
export async function getPostFamilyTree(postId: string): Promise<{
  post: PostWithInteractions | null;
  parent: PostWithInteractions | null;
  children: PostWithInteractions[];
  siblings: PostWithInteractions[];
}> {
  try {
    const post = await getPostWithInteractions(postId);
    if (!post) {
      return { post: null, parent: null, children: [], siblings: [] };
    }

    // Get parent if exists
    let parent: PostWithInteractions | null = null;
    if (post.parent_post_id) {
      parent = await getPostWithInteractions(post.parent_post_id);
    }

    // Get children
    const children = await getPostChildren(postId);

    // Get siblings (other children of the same parent)
    let siblings: PostWithInteractions[] = [];
    if (post.parent_post_id) {
      const allSiblings = await getPostChildren(post.parent_post_id);
      siblings = allSiblings.filter(sibling => sibling.id !== postId);
    }

    return { post, parent, children, siblings };
  } catch (error) {
    console.error('Error in getPostFamilyTree:', error);
    return { post: null, parent: null, children: [], siblings: [] };
  }
}

// Function to update parent's children_ids when a new remix is created
export async function addChildToParent(parentId: string, childId: string): Promise<boolean> {
  try {
    // First get the current parent post
    const { data: parentPost, error: fetchError } = await supabase
      .from('posts')
      .select('children_ids')
      .eq('id', parentId)
      .single();

    if (fetchError) {
      console.error('Error fetching parent post:', fetchError);
      return false;
    }

    // Add the new child to the children_ids array
    const currentChildren = parentPost.children_ids || [];
    if (!currentChildren.includes(childId)) {
      const updatedChildren = [...currentChildren, childId];

      const { error: updateError } = await supabase
        .from('posts')
        .update({ children_ids: updatedChildren })
        .eq('id', parentId);

      if (updateError) {
        console.error('Error updating parent children_ids:', updateError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error in addChildToParent:', error);
    return false;
  }
}

// Function to remove child from parent's children_ids
export async function removeChildFromParent(parentId: string, childId: string): Promise<boolean> {
  try {
    const { data: parentPost, error: fetchError } = await supabase
      .from('posts')
      .select('children_ids')
      .eq('id', parentId)
      .single();

    if (fetchError) {
      console.error('Error fetching parent post:', fetchError);
      return false;
    }

    const currentChildren = parentPost.children_ids || [];
    const updatedChildren = currentChildren.filter(id => id !== childId);

    const { error: updateError } = await supabase
      .from('posts')
      .update({ children_ids: updatedChildren })
      .eq('id', parentId);

    if (updateError) {
      console.error('Error updating parent children_ids:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in removeChildFromParent:', error);
    return false;
  }
}

// Function to check if a post is a remix
export function isRemixPost(post: PostWithInteractions): boolean {
  return post.is_remix === true || post.parent_post_id !== null;
}

// Function to check if a post has children
export function hasChildren(post: PostWithInteractions): boolean {
  return post.children_ids !== null && post.children_ids.length > 0;
}

// Function to get remix chain depth
export async function getRemixDepth(postId: string): Promise<number> {
  try {
    let depth = 0;
    let currentPostId = postId;

    while (currentPostId) {
      const { data: post, error } = await supabase
        .from('posts')
        .select('parent_post_id')
        .eq('id', currentPostId)
        .single();

      if (error || !post.parent_post_id) {
        break;
      }

      depth++;
      currentPostId = post.parent_post_id;
    }

    return depth;
  } catch (error) {
    console.error('Error calculating remix depth:', error);
    return 0;
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

// Check if a user liked a comment
export async function checkUserLikedComment(commentId: string, userId: string) {
  try {
    const { data, error } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking if user liked comment:', error);
    return false;
  }
}

// Toggle like on a comment
export async function toggleCommentLike(commentId: string, userId: string) {
  try {
    // Check if user already liked the comment
    const { data: existingLike, error: checkError } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingLike) {
      // Unlike the comment
      const { error: deleteError } = await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', userId);

      if (deleteError) throw deleteError;
      return { liked: false };
    } else {
      // Like the comment
      const { error: insertError } = await supabase
        .from('comment_likes')
        .insert({ comment_id: commentId, user_id: userId });

      if (insertError) throw insertError;
      return { liked: true };
    }
  } catch (error) {
    console.error('Error toggling comment like:', error);
    throw error;
  }
}

export async function getPostAudioUrl(post: Post | null | undefined): Promise<string | null> {
  if (!post || !post._url) {
    return null;
  }
  
  try {
    console.log("Getting audio URL for post:", post.title);
    console.log("Original URL:", post._url);
    
    // Check if the URL is a Supabase storage URL
    if (post._url.includes("supabase.co")) {
      const signedUrl = await createSignedAudioUrl(post._url, supabase);
      console.log("Generated URL:", signedUrl);
      return signedUrl;
    }
    
    return post._url;
  } catch (err) {
    console.error("Error getting post audio URL:", err);
    return post._url; // Return the original URL as fallback
  }
}