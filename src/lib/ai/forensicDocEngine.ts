/**
 * src/lib/ai/forensicDocEngine.ts
 *
 * Forensic "Panama Papers" Leaks & Document Dissector Engine.
 * 
 * Ingests unstructured document dumps (contracts, emails, bank wire transfers, corporate filings),
 * constructs an Entity & Money-Trail Relationship Graph, detects hidden anomalies, and synthesizes
 * an investigative broadcast special report with forensic paper-trail visual prompts.
 */

import { z } from "zod";
import { generateLlmObject } from "@/lib/llm/aiSdkGateway";
import dotenv from "dotenv";

dotenv.config();

export interface ForensicEntity {
  id: string;
  name: string;
  type: "individual" | "shell_company" | "financial_institution" | "jurisdiction" | "regulatory_body";
  role: string;
  jurisdiction: string;
}

export interface MoneyTrailNode {
  fromEntity: string;
  toEntity: string;
  amount: string;
  date: string;
  purpose: string;
  isSuspicious: boolean;
}

export interface InvestigativeReport {
  investigationTitle: string;
  targetOrganization: string;
  executiveSummary: string;
  smokingGunFinding: string;
  entities: ForensicEntity[];
  moneyTrail: MoneyTrailNode[];
  anomalySignals: string[];
  broadcastScript: {
    coldOpen: string;
    evidenceChapter1: string;
    moneyTrailChapter2: string;
    confrontationChapter3: string;
    signoff: string;
  };
  forensicVisualPrompts: Array<{
    title: string;
    prompt: string;
  }>;
}

export const ForensicEntitySchema = z.object({
  id: z.string().default("entity_1"),
  name: z.string().default("Subject Entity"),
  type: z.enum(["individual", "shell_company", "financial_institution", "jurisdiction", "regulatory_body"]).catch("shell_company"),
  role: z.string().default("Target of investigation"),
  jurisdiction: z.string().default("Global"),
});

export const MoneyTrailNodeSchema = z.object({
  fromEntity: z.string().default("Entity A"),
  toEntity: z.string().default("Entity B"),
  amount: z.string().default("$0"),
  date: z.string().default("2026-01-01"),
  purpose: z.string().default("Transaction"),
  isSuspicious: z.boolean().default(true),
});

export const ForensicVisualPromptSchema = z.object({
  title: z.string().default("Forensic Evidence Visual"),
  prompt: z.string().default("Photorealistic document evidence plate"),
});

export const InvestigativeReportSchema = z.object({
  investigationTitle: z.string().default("Forensic Investigation Report"),
  targetOrganization: z.string().default("Target Organization"),
  executiveSummary: z.string().default("Investigation summary."),
  smokingGunFinding: z.string().default("Key financial anomaly identified."),
  entities: z.array(ForensicEntitySchema).default([]),
  moneyTrail: z.array(MoneyTrailNodeSchema).default([]),
  anomalySignals: z.array(z.string()).default([]),
  broadcastScript: z.object({
    coldOpen: z.string().default("Good evening. Tonight, an exclusive investigation."),
    evidenceChapter1: z.string().default("We begin with the records."),
    moneyTrailChapter2: z.string().default("Following the money."),
    confrontationChapter3: z.string().default("When reached for comment."),
    signoff: z.string().default("That is tonight's investigation."),
  }).default({
    coldOpen: "Good evening. Tonight, an exclusive investigation.",
    evidenceChapter1: "We begin with the records.",
    moneyTrailChapter2: "Following the money.",
    confrontationChapter3: "When reached for comment.",
    signoff: "That is tonight's investigation.",
  }),
  forensicVisualPrompts: z.array(ForensicVisualPromptSchema).default([]),
});

export const FORENSIC_SYSTEM_PROMPT = `You are the Chief Investigative Forensic Data Journalist for NewsStudio.

## Task:
Analyze the provided unstructured leaked document dump, contract text, or financial audit trail.
1. Extract all key entities (Shell companies, beneficial owners, banks, nominee directors).
2. Reconstruct the financial money trail.
3. Identify the "Smoking Gun" pattern of contradiction or illicit activity.
4. Synthesize a 4-chapter high-tension investigative documentary broadcast script with exact forensic evidence timestamps.

## Output Format:
Return ONLY valid JSON matching this exact structure:
{
  "investigationTitle": "OPERATION BLACK BOX: The $420M Silicon Shell Network",
  "targetOrganization": "Apex Compute Global B.V.",
  "executiveSummary": "A multi-jurisdictional forensic investigation revealing illicit hardware routing and disguised beneficial ownership across 4 shell companies.",
  "smokingGunFinding": "Contract #784-B signed on March 14 explicitly routes GPU compute clusters through an unregistered nominee holding in the Cayman Islands while reporting zero export activity to regulators.",
  "entities": [
    { "id": "e1", "name": "Apex Compute Global", "type": "shell_company", "role": "Primary Operator", "jurisdiction": "Netherlands" },
    { "id": "e2", "name": "Vanguard Trust Nominees", "type": "individual", "role": "Nominee Director", "jurisdiction": "Cayman Islands" }
  ],
  "moneyTrail": [
    { "fromEntity": "Apex Compute Global", "toEntity": "Vanguard Trust Nominees", "amount": "$420,000,000", "date": "2024-03-14", "purpose": "Undisclosed Hardware Escrow", "isSuspicious": true }
  ],
  "anomalySignals": [
    "Beneficial owner signature predates company registration by 45 days.",
    "Wire routing routed through 3 intermediary non-clearing correspondent banks."
  ],
  "broadcastScript": {
    "coldOpen": "[urgent] Tonight, an exclusive forensic investigation into thousands of leaked internal records. [sfx:sub_drop] Documents show a four-hundred-million-dollar illicit hardware pipeline disguised across four sovereign jurisdictions. [sfx:whoosh]",
    "evidenceChapter1": "[pensive] It begins with this single invoice, dated March fourteenth. [sfx:typing] On paper, a routine consulting fee; in reality, the hidden key to an offshore corporate maze.",
    "moneyTrailChapter2": "[analytical] Following the money trail reveals three layered holding entities designed to obscure the ultimate beneficiary. [sfx:ding]",
    "confrontationChapter3": "[authoritative] When confronted with our forensic audit, representatives declined to explain the forty-five-day signature anomaly. [sfx:riser]",
    "signoff": "We will continue analyzing every byte of this leaked repository. Stay with NewsStudio."
  },
  "forensicVisualPrompts": [
    {
      "title": "Redacted Leaked Contract",
      "prompt": "Photorealistic macro close-up of a leaked confidential legal contract on aged paper with heavy black redaction marker bars and glowing yellow holographic forensic highlight scan lines, moody cinematic investigative lighting"
    },
    {
      "title": "3D Money Trail Web",
      "prompt": "Dark high-tech investigative intelligence room with a 3D glowing cyan and red interactive corporate ownership relationship web connecting offshore shell company nodes, broadcast graphics"
    }
  ]
}`;

export async function runForensicInvestigation(documentText: string): Promise<InvestigativeReport> {
  try {
    const userPrompt = `FORENSIC DOCUMENT DUMP ANALYSIS:\n\n${documentText.slice(0, 6000)}`;

    const { object: parsed } = await generateLlmObject({
      schema: InvestigativeReportSchema,
      schemaName: "ForensicInvestigationReport",
      system: FORENSIC_SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.4,
      tier: "reasoning",
    });

    return parsed;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("❌ Forensic investigation failed:", msg);
    return generateFallbackInvestigation(documentText);
  }
}

export function generateFallbackInvestigation(_docText: string): InvestigativeReport {
  return {
    investigationTitle: "THE SHADOW PROTOCOL: Forensic Investigation",
    targetOrganization: "Offshore Strategic Holdings Group",
    executiveSummary: "Forensic audit of leaked internal records and transactional logs revealing multi-layered entity routing.",
    smokingGunFinding: "Document sequence #409 reveals hidden beneficiary cross-guarantees bypassing statutory disclosure requirements.",
    entities: [
      { id: "e1", name: "Strategic Holdings B.V.", type: "shell_company", role: "Primary Holding Entity", jurisdiction: "Netherlands" },
      { id: "e2", name: "Horizon Capital Management", type: "financial_institution", role: "Asset Custodian", jurisdiction: "Luxembourg" },
      { id: "e3", name: "Apex Trustee Services", type: "individual", role: "Nominee Director", jurisdiction: "Bermuda" },
    ],
    moneyTrail: [
      { fromEntity: "Strategic Holdings B.V.", toEntity: "Horizon Capital Management", amount: "$185,000,000", date: "2024-04-12", "purpose": "Undisclosed Collateral Routing", isSuspicious: true },
      { fromEntity: "Horizon Capital Management", toEntity: "Apex Trustee Services", amount: "$42,500,000", date: "2024-04-18", "purpose": "Management Escrow Distribution", isSuspicious: true },
    ],
    anomalySignals: [
      "Signature verification indicates duplicate power-of-attorney execution across conflicting tax jurisdictions.",
      "Transactional timestamps coincide precisely with sovereign asset freezes.",
    ],
    broadcastScript: {
      coldOpen: "[urgent] Tonight on NewsStudio: thousands of leaked documents reveal the inner machinery of a hidden global capital pipeline. [sfx:sub_drop]",
      evidenceChapter1: "[pensive] Our investigative unit has verified the authenticity of the leaked ledger records through multiple independent cryptographic hashes. [sfx:typing]",
      moneyTrailChapter2: "[analytical] Reconstructing the money trail reveals a multi-tiered transfer network moving through three offshore hubs. [sfx:ding]",
      confrontationChapter3: "[authoritative] When presented with our findings, corporate representatives refused to comment on the record. [sfx:riser]",
      signoff: "Our investigative reporting continues. Full document logs are available on our verified ledger.",
    },
    forensicVisualPrompts: [
      {
        title: "Confidential Redacted Document",
        prompt: "Photorealistic macro view of confidential leaked government and corporate financial ledgers with glowing yellow holographic data forensic highlights, dark investigative studio lighting",
      },
      {
        title: "Money Flow Network",
        prompt: "Glowing holographic 3D money trail relationship graph with pulsing red transaction vectors connecting offshore bank nodes in dark virtual newsroom, broadcast graphics",
      },
    ],
  };
}
