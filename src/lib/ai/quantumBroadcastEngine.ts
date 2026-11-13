/**
 * src/lib/ai/quantumBroadcastEngine.ts
 *
 * "Infinite Quantum Broadcast" — Real-Time Branching Narrative DAG Engine.
 * 
 * Manages an interactive Directed Acyclic Graph (DAG) of broadcast decision nodes.
 * Allows viewers or live chat to dynamically steer the broadcast into deep technical math,
 * geopolitical analysis, or counter-argument cross-examination in real time.
 */

import { z } from "zod";
import { generateLlmObject } from "@/lib/llm/aiSdkGateway";
import dotenv from "dotenv";

dotenv.config();

export interface QuantumBranchOption {
  choiceId: string;
  label: string;                  // e.g. "🔬 Drill down into transformer attention math"
  audienceIntent: string;         // e.g. "Technical rigor"
  targetNodeId: string;
}

export interface QuantumNode {
  id: string;
  speakerId: string;
  speakerName: string;
  title: string;
  scriptText: string;
  cameraCue: string;
  actionState: string;
  graphicPrompt?: string;
  branches: QuantumBranchOption[];
}

export interface QuantumBroadcastTree {
  treeId: string;
  rootTopic: string;
  rootNodeId: string;
  nodes: Record<string, QuantumNode>;
}

export const QuantumBranchOptionSchema = z.object({
  choiceId: z.string().default("choice_1"),
  label: z.string().default("Next perspective"),
  audienceIntent: z.string().default("Explore deeper"),
  targetNodeId: z.string().default("node_root"),
});

export const QuantumNodeSchema = z.object({
  id: z.string().default("node_1"),
  speakerId: z.string().default("ruby"),
  speakerName: z.string().default("Ruby Sterling"),
  title: z.string().default("Broadcast Chapter"),
  scriptText: z.string().default("Interactive broadcast content."),
  cameraCue: z.string().default("cam1_wide"),
  actionState: z.string().default("anchor_neutral"),
  graphicPrompt: z.string().optional(),
  branches: z.array(QuantumBranchOptionSchema).default([]),
});

export const QuantumBroadcastTreeSchema = z.object({
  treeId: z.string().default("quantum_tree_1"),
  rootTopic: z.string().default("Interactive News Topic"),
  rootNodeId: z.string().default("node_root"),
  nodes: z.record(z.string(), QuantumNodeSchema),
});

export const QUANTUM_SYSTEM_PROMPT = `You are the Lead Quantum Interactive Narrative Architect for NewsStudio.

## Task:
Construct a 3-level interactive branching Directed Acyclic Graph (DAG) for a live continuous broadcast stream on the given topic.

Graph Structure:
- Level 0: Root Node (Anchor welcomes viewer and introduces core topic).
- Level 1: Three distinct branching paths:
  1. Node A (Technical Math / Mechanism Deep Dive)
  2. Node B (Geopolitical & Macroeconomic Sovereign Impact)
  3. Node C (Ethical & Human Labor Cross-Examination)
- Level 2: Synthesis and Resolution nodes for each branch.

## Output Format:
Return ONLY valid JSON matching this exact structure:
{
  "treeId": "tree_quantum_001",
  "rootTopic": "Topic name",
  "rootNodeId": "node_root",
  "nodes": {
    "node_root": {
      "id": "node_root",
      "speakerId": "ruby",
      "speakerName": "Ruby Vance",
      "title": "Core Breaking Transmission",
      "scriptText": "Welcome to the live interactive transmission. We are tracking a monumental structural shift in compute architecture. Where would you like to direct our coverage?",
      "cameraCue": "cam1_wide",
      "actionState": "state_intro_welcome",
      "branches": [
        { "choiceId": "c_tech", "label": "🔬 Drill down into Blackwell transformer engine math", "audienceIntent": "Technical", "targetNodeId": "node_tech_deep" },
        { "choiceId": "c_geo", "label": "🌐 Explore sovereign export restrictions & geopolitical leverage", "audienceIntent": "Geopolitics", "targetNodeId": "node_geo_deep" }
      ]
    },
    "node_tech_deep": {
      "id": "node_tech_deep",
      "speakerId": "ruby",
      "speakerName": "Ruby Vance",
      "title": "Transformer Attention & FP4 Quantization",
      "scriptText": "[analytical] Shifting focus to the micro-architecture: by transitioning from FP8 to dynamic FP4 quantization, memory bandwidth saturation drops by fifty percent while sustaining numerical convergence.",
      "cameraCue": "cam3_closeup",
      "actionState": "state_explaining",
      "branches": []
    },
    "node_geo_deep": {
      "id": "node_geo_deep",
      "speakerId": "ruby",
      "speakerName": "Ruby Vance",
      "title": "Sovereign Supply Chain Autonomy",
      "scriptText": "[authoritative] Looking at sovereign trade flows: eight nations have enacted immediate export reviews to retain strategic domestic silicon reserves.",
      "cameraCue": "cam2_left",
      "actionState": "state_breaking_alert",
      "branches": []
    }
  }
}`;

export async function generateQuantumBroadcastTree(topic: string): Promise<QuantumBroadcastTree> {
  try {
    const userPrompt = `GENERATE 3-LEVEL QUANTUM BROADCAST DAG TREE FOR TOPIC: "${topic}"`;

    const { object: parsed } = await generateLlmObject({
      schema: QuantumBroadcastTreeSchema,
      schemaName: "QuantumBroadcastTree",
      system: QUANTUM_SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.7,
      tier: "reasoning",
    });

    return parsed;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("❌ Quantum tree generation failed:", msg);
    return generateFallbackQuantumTree(topic);
  }
}

export function generateFallbackQuantumTree(topic: string): QuantumBroadcastTree {
  return {
    treeId: `quantum_tree_${Date.now()}`,
    rootTopic: topic,
    rootNodeId: "node_root",
    nodes: {
      node_root: {
        id: "node_root",
        speakerId: "ruby",
        speakerName: "Ruby Vance",
        title: "Live Interactive Root Broadcast",
        scriptText: `Welcome to the live interactive broadcast on ${topic}. Choose our next investigative trajectory.`,
        cameraCue: "cam1_wide",
        actionState: "state_intro_welcome",
        branches: [
          { choiceId: "c_tech", label: "🔬 Technical Architecture & Compute Math", audienceIntent: "Technical", targetNodeId: "node_tech_deep" },
          { choiceId: "c_econ", label: "📈 Macroeconomic Capital & Market Shifts", audienceIntent: "Financial", targetNodeId: "node_econ_deep" },
        ],
      },
      node_tech_deep: {
        id: "node_tech_deep",
        speakerId: "ruby",
        speakerName: "Ruby Vance",
        title: "Deep Technical Parameter Matrix",
        scriptText: `[analytical] Diving into the core computational mechanics of ${topic}: algorithmic throughput scales exponentially under unified memory fabrics.`,
        cameraCue: "cam3_closeup",
        actionState: "state_explaining",
        branches: [],
      },
      node_econ_deep: {
        id: "node_econ_deep",
        speakerId: "ruby",
        speakerName: "Ruby Vance",
        title: "Macro Capital Velocity Reallocation",
        scriptText: `[authoritative] Examining capital flows: enterprise liquidity is rotating into critical sovereign infrastructure at record volume.`,
        cameraCue: "cam2_left",
        actionState: "state_gesture_left",
        branches: [],
      },
    },
  };
}
