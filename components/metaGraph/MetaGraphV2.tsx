"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  useNodesState,
  useEdgesState,
  NodeProps,
  useReactFlow,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  SimulationNodeDatum,
  SimulationLinkDatum,
} from "d3-force";

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
import { Play, Pause } from "lucide-react";
import GraphSkeleton from "./GraphSkeleton";

// Types for d3-force simulation
interface SimNode extends SimulationNodeDatum {
  id: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  source: string | SimNode;
  target: string | SimNode;
}

// Custom Node Component
function PostNode({ data, selected }: NodeProps) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [postDetails, setPostDetails] = useState<any>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);

  const isSelected = selected || false;

  // Load full post details when selected
  useEffect(() => {
    const loadDetails = async () => {
      if (!isSelected) {
        setPostDetails(null);
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
              <Pause className="w-12 h-12 text-white" fill="white" />
            ) : (
              <Play className="w-12 h-12 text-white ml-1" fill="white" />
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
            <div className="flex flex-wrap gap-1.5 justify-center max-w-xs">
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

function MetaGraphInner() {
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [profileMap, setProfileMap] = useState<Map<string, any>>(new Map());

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const simulationRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Load posts data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const posts = await fetchAllPosts();
        const transformedData = transformPostsToGraphData(posts);
        const types = extractTypesFromPosts(posts);

        // Load author profiles
        const { supabase } = await import("@/utils/supabase");
        const userIds = [
          ...new Set(transformedData.nodes.map((node) => node.metadata.userId)),
        ].filter((id): id is string => typeof id === "string");

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, avatar_url")
          .in("id", userIds);

        setProfileMap(new Map(profiles?.map((p) => [p.id, p]) || []));
        setGraphData(transformedData);
        
        // Debug: log links to verify they exist
        console.log("Graph links:", transformedData.links);
        console.log("Number of links:", transformedData.links.length);
      } catch (error) {
        console.error("Error loading posts:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Store simulation nodes in a ref so we can access positions without re-running simulation
  const simNodesRef = useRef<SimNode[]>([]);

  // Initialize and run force simulation - only when graph data changes
  useEffect(() => {
    if (graphData.nodes.length === 0) return;

    // Create simulation nodes with initial random positions
    const simNodes: SimNode[] = graphData.nodes.map((node) => ({
      id: node.id,
      x: Math.random() * 800 - 400,
      y: Math.random() * 600 - 300,
    }));

    simNodesRef.current = simNodes;

    // Create simulation links from parent-child relationships
    const simLinks: SimLink[] = graphData.links.map((link) => ({
      source:
        typeof link.source === "object" ? (link.source as any).id : link.source,
      target:
        typeof link.target === "object" ? (link.target as any).id : link.target,
    }));

    // Create the simulation
    const simulation = forceSimulation<SimNode>(simNodes)
      .force(
        "link",
        forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(200)
          .strength(0.5)
      )
      .force("charge", forceManyBody().strength(-300))
      .force("center", forceCenter(0, 0))
      .force("collide", forceCollide(80))
      .alphaDecay(0.02)
      .velocityDecay(0.3);

    simulationRef.current = simulation;

    // Update React Flow nodes on each tick
    const updateNodes = () => {
      const flowNodes: Node[] = graphData.nodes.map((node) => {
        const simNode = simNodes.find((n) => n.id === node.id);
        const profile = node.metadata.userId
          ? profileMap.get(node.metadata.userId)
          : null;

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
        };
      });

      // Create edges for parent-child relationships
      const flowEdges: Edge[] = graphData.links.map((link) => {
        const sourceId =
          typeof link.source === "object"
            ? (link.source as any).id
            : link.source;
        const targetId =
          typeof link.target === "object"
            ? (link.target as any).id
            : link.target;

        return {
          id: `edge-${sourceId}-${targetId}`,
          source: sourceId,
          target: targetId,
          style: {
            stroke: "#9ECB45",
            strokeWidth: 2,
            opacity: 0.6,
          },
          type: "smoothstep",
          animated: false,
          zIndex: 0,
        };
      });
      
      console.log("Flow edges being set:", flowEdges);

      setNodes(flowNodes);
      setEdges(flowEdges);
    };

    // Run animation loop
    const tick = () => {
      if (simulation.alpha() > 0.01) {
        updateNodes();
        animationFrameRef.current = requestAnimationFrame(tick);
      } else {
        updateNodes(); // Final update
      }
    };

    tick();

    return () => {
      simulation.stop();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [graphData, profileMap, setNodes, setEdges]);

  // Handle node drag - update simulation
  const onNodeDrag = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (simulationRef.current) {
        const simNode = simulationRef.current
          .nodes()
          .find((n: SimNode) => n.id === node.id);
        if (simNode) {
          simNode.fx = node.position.x;
          simNode.fy = node.position.y;
          simulationRef.current.alpha(0.3).restart();
        }
      }
    },
    []
  );

  const onNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (simulationRef.current) {
        const simNode = simulationRef.current
          .nodes()
          .find((n: SimNode) => n.id === node.id);
        if (simNode) {
          // Release the node so it can move freely again
          simNode.fx = null;
          simNode.fy = null;
        }
      }
    },
    []
  );

  // Handle node click
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
  }, []);

  // Handle pane click
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Update selection state
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId,
      }))
    );
  }, [selectedNodeId, setNodes]);

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
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        className="bg-transparent"
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          style: { stroke: "#9ECB45", strokeWidth: 2 },
          type: "smoothstep",
        }}
      >
        {/* No Background component = no dots */}
        <Controls className="bg-white/10 border-white/20" />
      </ReactFlow>

      {nodes.length === 0 && !loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-lg text-white">No posts available.</div>
        </div>
      )}
      
      {/* Debug info - remove after confirming edges work */}
      <div className="absolute top-4 left-4 text-white/50 text-xs pointer-events-none">
        Nodes: {nodes.length} | Edges: {edges.length}
      </div>
    </div>
  );
}

// Wrap with ReactFlowProvider for hooks to work
export default function MetaGraphV2() {
  return (
    <ReactFlowProvider>
      <MetaGraphInner />
    </ReactFlowProvider>
  );
}