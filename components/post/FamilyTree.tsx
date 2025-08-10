"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

import {
  getPostFamilyTree,
  PostWithInteractions,
  isRemixPost,
  hasChildren,
} from "@/utils/postInteractions";
import { formatDate } from "@/utils/dataTransformer";
import { ChevronUp, ChevronDown, Play } from "lucide-react";

interface PostFamilyTreeProps {
  postId: string;
  onPostSelect?: (postId: string) => void;
}

export default function PostFamilyTree({
  postId,
  onPostSelect,
}: PostFamilyTreeProps) {
  const [familyData, setFamilyData] = useState<{
    post: PostWithInteractions | null;
    parent: PostWithInteractions | null;
    children: PostWithInteractions[];
    siblings: PostWithInteractions[];
  }>({
    post: null,
    parent: null,
    children: [],
    siblings: [],
  });
  const [loading, setLoading] = useState(true);
  const [showChildren, setShowChildren] = useState(true);
  const [showSiblings, setShowSiblings] = useState(false);

  useEffect(() => {
    const loadFamilyTree = async () => {
      setLoading(true);
      try {
        const data = await getPostFamilyTree(postId);
        setFamilyData(data);
      } catch (error) {
        console.error("Error loading family tree:", error);
      } finally {
        setLoading(false);
      }
    };

    loadFamilyTree();
  }, [postId]);

  const PostCard = ({
    post,
    isCurrentPost = false,
    relationship = "",
  }: {
    post: PostWithInteractions;
    isCurrentPost?: boolean;
    relationship?: string;
  }) => (
    <div
      className={`p-3 rounded-lg border transition-all ${
        isCurrentPost
          ? "border-primary bg-primary/5"
          : "border-muted hover:border-primary/50 cursor-pointer"
      }`}
      onClick={() => !isCurrentPost && onPostSelect?.(post.id)}
    >
      <div className="flex gap-3">
        {post.cover_image_url && (
          <Image
            src={post.cover_image_url}
            alt={post.title}
            width={60}
            height={60}
            className="rounded-md object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={`font-medium truncate ${
                isCurrentPost ? "text-primary" : ""
              }`}
            >
              {post.title}
            </h4>
            {relationship && (
              <Badge variant="outline" className="text-xs flex-shrink-0">
                {relationship}
              </Badge>
            )}
          </div>

          {post.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {post.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2">
            {post.types?.slice(0, 2).map((type, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {type}
              </Badge>
            ))}
            {post.types && post.types.length > 2 && (
              <span className="text-xs text-muted-foreground">
                +{post.types.length - 2} more
              </span>
            )}
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {post.created_at && formatDate(post.created_at)}
            </span>
            <div className="flex items-center gap-2">
              {(post.likes?.length ?? 0) > 0 && (
                <span className="text-xs text-muted-foreground">
                  {post.likes?.length} likes
                </span>
              )}
              {hasChildren(post) && (
                <span className="text-xs text-muted-foreground">
                  {post.children_ids?.length} echoes
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!familyData.post) {
    return (
      <div className="text-center text-muted-foreground py-4">
        Post not found
      </div>
    );
  }

  const { post, parent, children, siblings } = familyData;

  return (
    <div className="space-y-4">
      {/* Parent Post */}
      {parent && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Original
            </span>
          </div>
          <PostCard post={parent} relationship="Original" />
        </div>
      )}

      {/* Current Post */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Play className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Current Post</span>
          {isRemixPost(post) && (
            <Badge variant="outline" className="text-xs">
              Echo
            </Badge>
          )}
        </div>
        <PostCard post={post} isCurrentPost={true} />
      </div>

      {/* Siblings */}
      {siblings.length > 0 && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSiblings(!showSiblings)}
            className="p-0 h-auto text-muted-foreground hover:text-foreground mb-2"
          >
            <span className="text-sm font-medium">
              Other Echoes ({siblings.length})
            </span>
            <ChevronDown
              className={`w-4 h-4 ml-1 transition-transform ${
                showSiblings ? "rotate-180" : ""
              }`}
            />
          </Button>

          {showSiblings && (
            <div className="space-y-2">
              {siblings.map((sibling) => (
                <PostCard
                  key={sibling.id}
                  post={sibling}
                  relationship="Sibling Echo"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Children */}
      {children.length > 0 && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowChildren(!showChildren)}
            className="p-0 h-auto text-muted-foreground hover:text-foreground mb-2"
          >
            <ChevronDown
              className={`w-4 h-4 mr-1 transition-transform ${
                showChildren ? "rotate-180" : ""
              }`}
            />
            <span className="text-sm font-medium">
              Echoes of this post ({children.length})
            </span>
          </Button>

          {showChildren && (
            <div className="space-y-2">
              {children.map((child) => (
                <PostCard key={child.id} post={child} relationship="Echo" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* No relationships message */}
      {!parent && children.length === 0 && siblings.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          <p>This post has no echoes yet.</p>
          <p className="text-sm mt-1">Be the first to create an echo!</p>
        </div>
      )}
    </div>
  );
}
