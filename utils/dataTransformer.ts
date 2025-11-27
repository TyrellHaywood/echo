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
  strength?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface RemixFamily {
  rootPost: any;
  members: any[];
  depth: number;
  totalPosts: number;
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
      track_count: post.track_count ?? null,
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

// Enhanced function to create more sophisticated graph links
export function createGraphLinks(posts: any[]): GraphLink[] {
  const links: GraphLink[] = [];
  const postMap = new Map(posts.map(post => [post.id, post]));

  posts.forEach((post) => {
    // Create parent-child relationships
    if (post.parent_post_id && postMap.has(post.parent_post_id)) {
      links.push({
        source: post.parent_post_id,
        target: post.id,
        value: 2, // Stronger connection for parent-child
        type: 'parent-child',
        strength: 0.8
      });
    }

    // Create type-based relationships (weaker connections)
    if (post.types && post.types.length > 0) {
      posts.forEach((otherPost) => {
        if (otherPost.id !== post.id && 
            otherPost.types && 
            !hasDirectRelationship(post, otherPost)) {
          
          const commonTypes = post.types.filter((type: string) => 
            otherPost.types.includes(type)
          );
          
          if (commonTypes.length > 0) {
            // Only create link if we don't already have one
            const existingLink = links.find(link => 
              (link.source === post.id && link.target === otherPost.id) ||
              (link.source === otherPost.id && link.target === post.id)
            );
            
            if (!existingLink) {
              links.push({
                source: post.id,
                target: otherPost.id,
                value: commonTypes.length * 0.5,
                type: 'type-similarity',
                strength: 0.3
              });
            }
          }
        }
      });
    }
  });

  return links;
}

// Helper function to check if two posts have a direct relationship
function hasDirectRelationship(post1: any, post2: any): boolean {
  return post1.parent_post_id === post2.id || 
         post2.parent_post_id === post1.id ||
         (post1.children_ids && post1.children_ids.includes(post2.id)) ||
         (post2.children_ids && post2.children_ids.includes(post1.id));
}

// Calculate how deep in the remix chain a post is
function calculateRemixDepth(post: any, allPosts: any[]): number {
  let depth = 0;
  let currentPost = post;
  const visited = new Set(); // Prevent infinite loops

  while (currentPost.parent_post_id && !visited.has(currentPost.id)) {
    visited.add(currentPost.id);
    const parentPost = allPosts.find(p => p.id === currentPost.parent_post_id);
    if (!parentPost) break;
    
    depth++;
    currentPost = parentPost;
  }

  return depth;
}

// Function to get remix families (groups of related posts)
export function getRemixFamilies(posts: any[]): RemixFamily[] {
  const families: RemixFamily[] = [];
  const processedPosts = new Set();

  posts.forEach(post => {
    if (processedPosts.has(post.id)) return;

    // Find the root post (no parent)
    let rootPost = post;
    while (rootPost.parent_post_id) {
      const parent = posts.find(p => p.id === rootPost.parent_post_id);
      if (!parent) break;
      rootPost = parent;
    }

    // If we've already processed this family, skip
    if (processedPosts.has(rootPost.id)) return;

    // Collect all descendants
    const familyMembers = collectDescendants(rootPost, posts);
    familyMembers.forEach(member => processedPosts.add(member.id));

    if (familyMembers.length > 1) { // Only families with more than one member
      families.push({
        rootPost,
        members: familyMembers,
        depth: Math.max(...familyMembers.map(m => calculateRemixDepth(m, posts))),
        totalPosts: familyMembers.length
      });
    }
  });

  return families;
}

// Helper function to collect all descendants of a post
function collectDescendants(rootPost: any, allPosts: any[]): any[] {
  const descendants = [rootPost];
  const toProcess = [rootPost];
  const processed = new Set([rootPost.id]);

  while (toProcess.length > 0) {
    const current = toProcess.shift();
    if (!current) continue;

    // Find direct children
    const children = allPosts.filter(post => 
      post.parent_post_id === current.id && !processed.has(post.id)
    );

    children.forEach(child => {
      descendants.push(child);
      toProcess.push(child);
      processed.add(child.id);
    });
  }

  return descendants;
}