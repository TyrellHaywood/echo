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
  coverImageUrl?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  metadata: {
    type: string[];
    description?: string;
    createdAt?: string;
    userId?: string;
    isRemix?: boolean;
    parentPostId?: string;
    childrenIds?: string[];
  };
}


export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number;
  type?: string;
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
      children_ids: post.children_ids ?? null,
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
export function transformPostsToGraphData(posts: any[]): GraphData {
  // Create nodes
  const nodes: GraphNode[] = posts.map((post) => ({
    id: post.id,
    name: post.title,
    coverImageUrl: post.cover_image_url,
    metadata: {
      type: post.types || [],
      description: post.description,
      createdAt: post.created_at,
      userId: post.user_id,
      isRemix: post.is_remix || false,
      parentPostId: post.parent_post_id,
      childrenIds: post.children_ids || [],
    },
  }));

  // Create links based on parent-child relationships
  const links: GraphLink[] = [];
  
  posts.forEach((post) => {
    // If this post has a parent, create a link to it
    if (post.parent_post_id) {
      const parentExists = posts.find(p => p.id === post.parent_post_id);
      if (parentExists) {
        links.push({
          source: post.parent_post_id,
          target: post.id,
          value: 1,
          type: 'parent-child'
        });
      }
    }

    // If this post has children, create links to them
    if (post.children_ids && post.children_ids.length > 0) {
      post.children_ids.forEach((childId: string) => {
        const childExists = posts.find(p => p.id === childId);
        if (childExists) {
          // Only add if we haven't already added this link from the child's perspective
          const linkExists = links.find(
            link => link.source === post.id && link.target === childId
          );
          if (!linkExists) {
            links.push({
              source: post.id,
              target: childId,
              value: 1,
              type: 'parent-child'
            });
          }
        }
      });
    }
  });

  // Remove duplicate links (safety check)
  const uniqueLinks = links.filter((link, index, self) => 
    index === self.findIndex(l => 
      l.source === link.source && l.target === link.target
    )
  );

  return { nodes, links: uniqueLinks };
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