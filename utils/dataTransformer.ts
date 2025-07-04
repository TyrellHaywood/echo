import { supabase } from "@/utils/supabase";
import { Database } from '../types/supabase';

// MetaGraph types
export interface NodeMetadata {
  type: string[];
  parent: string;
  child: string;
}

export interface GraphNode {
  id: string;
  name: string;
  metadata: NodeMetadata;
  coverImageUrl?: string; 
  audioUrl?: string; 
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  id: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Post type from database
type Post = Database['public']['Tables']['posts']['Row'];

// Fetch all posts from Supabase
export async function fetchAllPosts(): Promise<Post[]> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
      return [];
    }

    return (data || []).map((post: any) => ({
      id: post.id,
      title: post.title,
      description: post.description ?? null,
      types: post.types ?? [],
      cover_image_url: post.cover_image_url ?? "",
      _url: post._url,
      parent_id: post.parent_id ?? "",
      child_id: post.child_id ?? "",
      user_id: post.user_id ?? null,
      created_at: post.created_at ?? null,
      duration: post.duration ?? null,
      is_remix: post.is_remix ?? null,
      parent_post_id: post.parent_post_id ?? null,
      updated_at: post.updated_at ?? null,
    }));

  } catch (error) {
    console.error('Error in fetchAllPosts:', error);
    return [];
  }
}

// Transform posts to MetaGraph format
export function transformPostsToGraphData(posts: Post[]): GraphData {
  // Create nodes from posts
  const nodes: GraphNode[] = posts.map(post => ({
    id: post.id,
    name: post.title,
    metadata: {
      type: post.types || [],
      parent: post.parent_id || "",
      child: post.child_id || "",
    },
    coverImageUrl: post.cover_image_url ?? undefined,
    audioUrl: post._url,
  }));

  // Create links based on parent-child relationships
  const links: GraphLink[] = [];
  
  posts.forEach(post => {
    // Create link from parent to child
    if (post.parent_id && posts.find(p => p.id === post.parent_id)) {
      links.push({
        source: post.parent_id,
        target: post.id,
        id: `${post.parent_id}-${post.id}`,
      });
    }

    // Create link from current post to child
    if (post.child_id && posts.find(p => p.id === post.child_id)) {
      links.push({
        source: post.id,
        target: post.child_id,
        id: `${post.id}-${post.child_id}`,
      });
    }
  });

  return { nodes, links };
}

// Create color mapping for types
export function createTypeColorMap(types: string[]): Record<string, string> {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#FFA07A', // Light Salmon
    '#98D8C8', // Mint
    '#F7DC6F', // Yellow
    '#BB8FCE', // Purple
    '#85C1E9', // Light Blue
    '#F8C471', // Orange
    '#82E0AA', // Light Green
  ];

  const colorMap: Record<string, string> = {};
  
  types.forEach((type, index) => {
    colorMap[type] = colors[index % colors.length];
  });

  return colorMap;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${month} ${day}, ${year}`;
}