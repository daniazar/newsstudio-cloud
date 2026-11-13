import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateQuantumBroadcastTree,
  generateFallbackQuantumTree,
  QUANTUM_SYSTEM_PROMPT,
} from "../quantumBroadcastEngine";

const generateLlmObjectMock = vi.fn();

vi.mock("@/lib/llm/aiSdkGateway", () => ({
  generateLlmObject: (...args: unknown[]) => generateLlmObjectMock(...args),
}));

describe("Quantum Branching Narrative DAG Engine (quantumBroadcastEngine.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("QUANTUM_SYSTEM_PROMPT", () => {
    it("should define multi-level interactive DAG structure requirements", () => {
      expect(typeof QUANTUM_SYSTEM_PROMPT).toBe("string");
      expect(QUANTUM_SYSTEM_PROMPT).toContain("DAG");
      expect(QUANTUM_SYSTEM_PROMPT).toContain("rootNodeId");
      expect(QUANTUM_SYSTEM_PROMPT).toContain("branches");
    });
  });

  describe("generateFallbackQuantumTree", () => {
    it("should build deterministic 3-level interactive tree for given topic", () => {
      const topic = "Nuclear Fusion Energy Ignition";
      const tree = generateFallbackQuantumTree(topic);

      expect(tree.rootTopic).toBe(topic);
      expect(tree.rootNodeId).toBe("node_root");
      expect(tree.nodes["node_root"]).toBeDefined();
      expect(tree.nodes["node_root"].branches.length).toBeGreaterThanOrEqual(2);

      // Check branch destinations exist in node dictionary
      for (const branch of tree.nodes["node_root"].branches) {
        expect(tree.nodes[branch.targetNodeId]).toBeDefined();
      }
    });
  });

  describe("generateQuantumBroadcastTree", () => {
    const topic = "Neuromorphic Computing Architecture";

    it("should generate dynamic interactive broadcast tree via LLM gateway", async () => {
      generateLlmObjectMock.mockResolvedValueOnce({
        object: {
          treeId: "tree_neuro_001",
          rootTopic: topic,
          rootNodeId: "node_root",
          nodes: {
            node_root: {
              id: "node_root",
              speakerId: "ruby",
              speakerName: "Ruby Vance",
              title: "Neuromorphic Chip Ignition",
              scriptText: "Welcome to our live quantum analysis on neuromorphic silicon.",
              cameraCue: "cam1_wide",
              actionState: "state_intro_welcome",
              branches: [
                {
                  choiceId: "c_spikes",
                  label: "🧠 Spiking neural network bio-physics",
                  audienceIntent: "Physics",
                  targetNodeId: "node_spikes",
                },
              ],
            },
            node_spikes: {
              id: "node_spikes",
              speakerId: "blaze",
              speakerName: "Blaze Wilder",
              title: "Synaptic Weight Dynamics",
              scriptText: "By mimicing biological synapses, milliwatt power draws achieve petaflop throughput.",
              cameraCue: "cam3_closeup",
              actionState: "state_explaining",
              branches: [],
            },
          },
        },
        providerUsed: "gemini",
        modelUsed: "gemini-2.5-flash",
      });

      const tree = await generateQuantumBroadcastTree(topic);

      expect(generateLlmObjectMock).toHaveBeenCalledTimes(1);
      expect(tree.treeId).toBe("tree_neuro_001");
      expect(tree.rootNodeId).toBe("node_root");
      expect(Object.keys(tree.nodes).length).toBe(2);
      expect(tree.nodes["node_root"].branches[0].choiceId).toBe("c_spikes");
    });

    it("should fall back gracefully to programmatic tree when LLM gateway throws", async () => {
      generateLlmObjectMock.mockRejectedValueOnce(new Error("Network connection reset"));

      const tree = await generateQuantumBroadcastTree(topic);

      expect(tree.rootTopic).toBe(topic);
      expect(tree.rootNodeId).toBe("node_root");
      expect(tree.nodes["node_root"].scriptText).toContain(topic);
    });
  });
});
