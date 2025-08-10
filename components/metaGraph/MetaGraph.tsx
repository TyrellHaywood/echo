// Dependencies
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ForceGraphMethods } from "react-force-graph-2d";

// Utils
import {
  fetchAllPosts,
  transformPostsToGraphData,
  createTypeColorMap,
  GraphData,
  GraphNode,
} from "@/utils/dataTransformer";
import { extractTypesFromPosts } from "@/utils/postInteractions";

// UI Components
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import GraphSkeleton from "./GraphSkeleton";

// Dynamically import ForceGraph2D with SSR disabled
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center">
      <div className="text-lg">
        <LoadingSpinner />
        Loading graph
      </div>
    </div>
  ),
});

export default function MetaGraph() {
  const router = useRouter();
  const fgRef = useRef<ForceGraphMethods>(undefined);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [typeColors, setTypeColors] = useState<Record<string, string>>({});
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });
  const [loading, setLoading] = useState(true);
  const [imageCache, setImageCache] = useState<
    Record<string, HTMLImageElement>
  >({});

  // Load posts data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const posts = await fetchAllPosts();
        const transformedData = transformPostsToGraphData(posts);
        const types = extractTypesFromPosts(posts);
        const colors = createTypeColorMap(types);

        setGraphData(transformedData);
        setAvailableTypes(types);
        setSelectedTypes(types); // Show all types by default
        setTypeColors(colors);
      } catch (error) {
        console.error("Error loading posts:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Preload images for better performance
  useEffect(() => {
    const preloadImages = async () => {
      const newImageCache: Record<string, HTMLImageElement> = {};

      for (const node of graphData.nodes) {
        if (node.coverImageUrl && !imageCache[node.id]) {
          try {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = node.coverImageUrl;

            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
            });

            newImageCache[node.id] = img;
          } catch (error) {}
        }
      }

      setImageCache((prev) => ({ ...prev, ...newImageCache }));
    };

    if (graphData.nodes.length > 0) {
      preloadImages();
    }
  }, [graphData.nodes]);

  // Filter nodes based on selected types
  const filteredData = React.useMemo((): GraphData => {
    if (selectedTypes.length === 0) return { nodes: [], links: [] };

    const filteredNodes = graphData.nodes.filter(
      (node) =>
        node.metadata.type &&
        node.metadata.type.some((type) => selectedTypes.includes(type))
    );

    const nodeIds = new Set(filteredNodes.map((node) => node.id));

    const filteredLinks = graphData.links.filter((link) => {
      const sourceId =
        typeof link.source === "object" ? link.source.id : link.source;
      const targetId =
        typeof link.target === "object" ? link.target.id : link.target;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    return { nodes: filteredNodes, links: filteredLinks };
  }, [graphData, selectedTypes]);

  // Apply clustering forces
  useEffect(() => {
    if (fgRef.current && filteredData.nodes.length > 0) {
      // Group by type for clustering
      const typeGroups: Record<string, string[]> = {};
      filteredData.nodes.forEach((node) => {
        if (node.metadata.type && node.metadata.type.length > 0) {
          node.metadata.type.forEach((type) => {
            if (!typeGroups[type]) {
              typeGroups[type] = [];
            }
            typeGroups[type].push(node.id);
          });
        }
      });

      // Reset forces
      const chargeForce = fgRef.current.d3Force("charge");
      if (chargeForce) {
        chargeForce.strength(-200);
      }

      const linkForce = fgRef.current.d3Force("link");
      if (linkForce) {
        linkForce.distance(120);
      }

      // Clear existing custom forces
      availableTypes.forEach((type) => {
        fgRef.current?.d3Force(`cluster-${type}`, null);
      });

      // Add new cluster forces
      Object.keys(typeGroups).forEach((type, typeIndex) => {
        const theta =
          (2 * Math.PI * typeIndex) / Object.keys(typeGroups).length;
        const radius = 250;
        const centerX = radius * Math.cos(theta);
        const centerY = radius * Math.sin(theta);

        fgRef.current?.d3Force(`cluster-${type}`, (alpha: number) => {
          for (let i = 0; i < filteredData.nodes.length; i++) {
            const node = filteredData.nodes[i];
            if (node.metadata.type && node.metadata.type.includes(type)) {
              const k = 0.1 * alpha;
              const dx = centerX - (node.x || 0);
              const dy = centerY - (node.y || 0);
              if (node.vx !== undefined) node.vx += dx * k;
              if (node.vy !== undefined) node.vy += dy * k;
            }
          }
        });
      });

      fgRef.current.d3ReheatSimulation();
    }
  }, [filteredData, availableTypes]);

  const handleNodeHover = (node: GraphNode | null): string => {
    if (!node) return "";
    return `${node.name}\n`;
  };

  const handleNodeClick = (node: GraphNode) => {
    // Navigate to the post page if router is available
    if (typeof window !== "undefined" && router) {
      router.push(`/post/${node.id}`);
    }
  };

  if (loading) {
    return <GraphSkeleton />;
  }

  return (
    <div className="w-full h-screen relative">
      <div className="w-full h-full">
        {filteredData.nodes.length > 0 ? (
          <ForceGraph2D
            ref={fgRef}
            graphData={filteredData}
            nodeRelSize={10}
            nodeLabel={(node) => handleNodeHover(node as GraphNode)}
            linkColor={() => "rgba(100, 100, 100, 0.6)"}
            linkWidth={2}
            cooldownTicks={100}
            onEngineStop={() => fgRef.current?.zoomToFit(400)}
            onNodeClick={(node) => handleNodeClick(node as GraphNode)}
            nodeCanvasObject={(node, ctx, globalScale) => {
              const typedNode = node as GraphNode;
              const nodeSize = 14;
              const x = node.x || 0;
              const y = node.y || 0;

              // Check if we have a cached image for this node
              const cachedImage = imageCache[typedNode.id];

              if (cachedImage && typedNode.coverImageUrl) {
                // Draw rounded rectangle clipped image
                const cornerRadius = 3;

                ctx.save();

                // Create rounded rectangle path
                ctx.beginPath();
                ctx.moveTo(x - nodeSize + cornerRadius, y - nodeSize);
                ctx.lineTo(x + nodeSize - cornerRadius, y - nodeSize);
                ctx.quadraticCurveTo(
                  x + nodeSize,
                  y - nodeSize,
                  x + nodeSize,
                  y - nodeSize + cornerRadius
                );
                ctx.lineTo(x + nodeSize, y + nodeSize - cornerRadius);
                ctx.quadraticCurveTo(
                  x + nodeSize,
                  y + nodeSize,
                  x + nodeSize - cornerRadius,
                  y + nodeSize
                );
                ctx.lineTo(x - nodeSize + cornerRadius, y + nodeSize);
                ctx.quadraticCurveTo(
                  x - nodeSize,
                  y + nodeSize,
                  x - nodeSize,
                  y + nodeSize - cornerRadius
                );
                ctx.lineTo(x - nodeSize, y - nodeSize + cornerRadius);
                ctx.quadraticCurveTo(
                  x - nodeSize,
                  y - nodeSize,
                  x - nodeSize + cornerRadius,
                  y - nodeSize
                );
                ctx.closePath();
                ctx.clip();

                // Draw the image
                ctx.drawImage(
                  cachedImage,
                  x - nodeSize,
                  y - nodeSize,
                  nodeSize * 2,
                  nodeSize * 2
                );

                ctx.restore();
              } else {
                // Fallback: draw rounded rectangle with first letter
                const cornerRadius = 3;

                ctx.fillStyle = "#666"; // Neutral color
                ctx.beginPath();
                ctx.moveTo(x - nodeSize + cornerRadius, y - nodeSize);
                ctx.lineTo(x + nodeSize - cornerRadius, y - nodeSize);
                ctx.quadraticCurveTo(
                  x + nodeSize,
                  y - nodeSize,
                  x + nodeSize,
                  y - nodeSize + cornerRadius
                );
                ctx.lineTo(x + nodeSize, y + nodeSize - cornerRadius);
                ctx.quadraticCurveTo(
                  x + nodeSize,
                  y + nodeSize,
                  x + nodeSize - cornerRadius,
                  y + nodeSize
                );
                ctx.lineTo(x - nodeSize + cornerRadius, y + nodeSize);
                ctx.quadraticCurveTo(
                  x - nodeSize,
                  y + nodeSize,
                  x - nodeSize,
                  y + nodeSize - cornerRadius
                );
                ctx.lineTo(x - nodeSize, y - nodeSize + cornerRadius);
                ctx.quadraticCurveTo(
                  x - nodeSize,
                  y - nodeSize,
                  x - nodeSize + cornerRadius,
                  y - nodeSize
                );
                ctx.closePath();
                ctx.fill();

                // Draw first letter of title
                const fontSize = 8 / globalScale;
                ctx.font = `bold ${fontSize}px Sans-Serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "#fff";
                ctx.fillText(typedNode.name.charAt(0).toUpperCase(), x, y);
              }

              // Draw title below node
              const fontSize = 8 / globalScale;
              ctx.font = `${fontSize}px Sans-Serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillStyle = "#FFFDFC";
              ctx.fillText(typedNode.name, x, y + nodeSize + 8);
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-lg">No posts available.</div>
          </div>
        )}
      </div>
    </div>
  );
}
