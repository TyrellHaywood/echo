"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  NodeProps,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from "d3-force";

// Utils
import {
  fetchAllPosts,
  transformPostsToGraphData,
  createTypeColorMap,
  GraphData,
  GraphNode,
} from "@/utils/dataTransformer";
import { extractTypesFromPosts } from "@/utils/postInteractions";
import { getBadgeColor, hexToRgba } from "@/utils/badgeColors";

// UI Components
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Play, Pause } from "lucide-react";
import GraphSkeleton from "./GraphSkeleton";

// Custom Node Component
function PostNode({ data, selected }: NodeProps) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [postDetails, setPostDetails] = useState<any>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);

  // Sync selected state from parent
  const isSelected = selected || false;

  // Load full post details when selected
  useEffect(() => {
    const loadDetails = async () => {
      if (!isSelected) {
        setPostDetails(null);
        // Stop audio when deselected
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setIsPlaying(false);
        }
        return;
      }

      setLoadingAudio(true);
      try {
        const { supabase } = await import("@/utils/supabase");
        const { data: post, error } = await supabase
          .from("posts")
          .select("*")
          .eq("id", data.id)
          .single();

        if (!error && post) {
          setPostDetails({
            audioUrl: post._url,
          });
        }
      } catch (error) {
        console.error("Error loading post details:", error);
      } finally {
        setLoadingAudio(false);
      }
    };

    loadDetails();
  }, [isSelected, data.id]);

  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current || !postDetails?.audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/post/${data.id}`);
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      setIsPlaying(false);
    };
  }, []);

  const shouldShowInfo = isHovered || isSelected;

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Title above node */}
      {shouldShowInfo && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 pointer-events-auto">
          <button
            onClick={handleTitleClick}
            className="text-title font-plex-serif text-white hover:text-[#9ECB45] transition-colors whitespace-nowrap"
          >
            {data.name}
          </button>
        </div>
      )}

      {/* Main Node - Rounded Square Image */}
      <div className="relative">
        <div
          className={`w-32 h-32 rounded-lg overflow-hidden cursor-pointer transition-all ${
            isSelected 
              ? "shadow-[0_0_20px_rgba(158,203,69,0.5)]" 
              : isHovered 
              ? "shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
              : "shadow-lg"
          }`}
        >
          {data.coverImageUrl ? (
            <img
              src={data.coverImageUrl}
              alt={data.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#666] flex items-center justify-center">
              <span className="text-4xl text-white font-bold">
                {data.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Play Button Overlay - only when selected */}
        {isSelected && postDetails?.audioUrl && (
          <button
            onClick={togglePlayPause}
            disabled={loadingAudio}
            className="absolute inset-0 w-32 h-32 rounded-lg bg-black/40 hover:bg-black/50 transition-colors flex items-center justify-center"
          >
            {loadingAudio ? (
              <LoadingSpinner size={40} className="text-white" />
            ) : isPlaying ? (
              <Pause className="w-8 h-8 text-white" fill="white" />
            ) : (
              <Play className="w-8 h-8 text-white ml-1" fill="white" />
            )}
          </button>
        )}
      </div>

      {/* Details Below Node */}
      {shouldShowInfo && (
        <div className="absolute top-36 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-auto">
          {/* Author */}
          {data.authorName && (
            <div className="flex items-center gap-2 text-description font-source-sans text-white/80">
              {data.authorName}
            </div>
          )}

          {/* Badges */}
          {data.types && data.types.length > 0 && (
            <div className="flex gap-1.5 justify-center max-w-xs">
              {data.types.map((type: string) => {
                const color = getBadgeColor(type);
                return (
                  <Badge
                    key={type}
                    className="border font-source-sans text-sub-description pointer-events-none"
                    style={{
                      backgroundColor: hexToRgba(color, 0.2),
                      borderColor: hexToRgba(color, 0.4),
                      color: "#FFFDFC",
                    }}
                  >
                    {type}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Hidden audio element */}
      {isSelected && postDetails?.audioUrl && (
        <audio
          ref={audioRef}
          src={postDetails.audioUrl}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          preload="metadata"
        />
      )}
    </div>
  );
}

const nodeTypes = {
  post: PostNode,
};

export default function MetaGraphV2() {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Load posts data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const posts = await fetchAllPosts();
        const transformedData = transformPostsToGraphData(posts);
        const types = extractTypesFromPosts(posts);

        setGraphData(transformedData);
        setAvailableTypes(types);
        setSelectedTypes(types);
      } catch (error) {
        console.error("Error loading posts:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Apply force-directed layout and load author data
  useEffect(() => {
    if (graphData.nodes.length === 0) return;

    const loadNodesWithAuthors = async () => {
      const { supabase } = await import("@/utils/supabase");
      
      // Get all unique user IDs
      const userIds = [...new Set(graphData.nodes.map(node => node.metadata.userId))].filter((id): id is string => typeof id === "string");
      
      // Fetch all authors at once
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Convert to d3-force format
      const simulationNodes = graphData.nodes.map((node) => ({
        id: node.id,
        x: Math.random() * 800,
        y: Math.random() * 600,
      }));

      const simulationLinks = graphData.links.map((link) => ({
        source: typeof link.source === "object" ? link.source.id : link.source,
        target: typeof link.target === "object" ? link.target.id : link.target,
      }));

      // Run force simulation
      const simulation = forceSimulation(simulationNodes as any)
        .force(
          "link",
          forceLink(simulationLinks)
            .id((d: any) => d.id)
            .distance(180)
        )
        .force("charge", forceManyBody().strength(-400))
        .force("center", forceCenter(400, 300))
        .force("collide", forceCollide(80));

      // Run simulation to converge
      for (let i = 0; i < 300; i++) {
        simulation.tick();
      }

      // Convert to React Flow nodes
      const flowNodes: Node[] = graphData.nodes.map((node) => {
        const simNode = simulationNodes.find((n) => n.id === node.id);
        const profile = node.metadata.userId ? profileMap.get(node.metadata.userId) : null;
        
        return {
          id: node.id,
          type: "post",
          position: {
            x: simNode?.x || 0,
            y: simNode?.y || 0,
          },
          data: {
            id: node.id,
            name: node.name,
            coverImageUrl: node.coverImageUrl,
            types: node.metadata.type,
            authorName: profile?.name || null,
            authorAvatar: profile?.avatar_url || null,
          },
          draggable: true,
          selected: false,
        };
      });

      // Convert to React Flow edges
      const flowEdges: Edge[] = graphData.links.map((link, index) => ({
        id: `e-${index}`,
        source: typeof link.source === "object" ? link.source.id : link.source,
        target: typeof link.target === "object" ? link.target.id : link.target,
        style: { stroke: "rgba(100, 100, 100, 0.6)", strokeWidth: 2 },
        type: "straight",
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    };

    loadNodesWithAuthors();
  }, [graphData, setNodes, setEdges]);

  // Update node selection state when selectedNodeId changes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId,
      }))
    );
  }, [selectedNodeId, setNodes]);

  // Handle node click
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
  }, []);

  // Handle pane click (clicking on background)
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  if (loading) {
    return <GraphSkeleton />;
  }

  return (
    <div className="w-full h-screen relative z-10">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        className="bg-transparent"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#444" gap={16} />
      </ReactFlow>

      {nodes.length === 0 && !loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-lg text-white">No posts available.</div>
        </div>
      )}
    </div>
  );
}