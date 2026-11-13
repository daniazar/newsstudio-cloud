/**
 * src/lib/ai/conversationalDirector.ts
 *
 * Clause-Based LLM Token Streaming Parser & Conversational Action Loop Director.
 * Triggers sub-100ms Time-To-First-Token (TTFT) speech synthesis on clause boundaries
 * and directs synchronized Action Loop body transitions from inline gesture directives.
 */

export interface ConversationalClause {
  index: number;
  text: string;
  gestureTag?: string;
  actionLoopId: string;
  isTerminal: boolean;
  estimatedDurationSec: number;
}

export const GESTURE_TO_ACTION_LOOP_MAP: Record<string, string> = {
  idle: "ruby_idle",
  hands_open: "ruby_intro_welcome",
  welcome: "ruby_intro_welcome",
  intro: "ruby_intro_welcome",
  gesture_right: "ruby_gesture_right",
  gesture_left: "ruby_gesture_left",
  emphasis: "ruby_emphasis_nod",
  nod: "ruby_emphasis_nod",
  notes: "ruby_look_down_notes",
  look_down: "ruby_look_down_notes",
  analyst: "ruby_deep_thought_analyst",
  deep_thought: "ruby_deep_thought_analyst",
  listen: "ruby_listen_tilt",
  listen_tilt: "ruby_listen_tilt",
  breaking: "ruby_breaking_alert",
  alert: "ruby_breaking_alert",
  signoff: "ruby_signoff_outro",
  outro: "ruby_signoff_outro",
};

export class ConversationalDirector {
  private buffer: string = "";
  private clauseIndex: number = 0;
  private currentActionLoop: string = "ruby_idle";

  /**
   * Pushes incoming LLM token chunks and yields completed conversational clauses
   * whenever a clause delimiter (',', ';', '.', '?', '!', '\n') is reached.
   */
  public pushTokens(tokenChunk: string): ConversationalClause[] {
    this.buffer += tokenChunk;
    const completedClauses: ConversationalClause[] = [];

    // Delimiters for clause streaming
    const delimiterRegex = /([,;.?!:\n]+)/g;
    let match: RegExpExecArray | null;

    let lastCutIndex = 0;
    while ((match = delimiterRegex.exec(this.buffer)) !== null) {
      const cutEnd = match.index + match[0].length;
      const rawClause = this.buffer.substring(lastCutIndex, cutEnd).trim();

      // Only emit if clause contains meaningful spoken words (at least 3 characters)
      if (rawClause.length >= 3) {
        const parsed = this._parseClause(rawClause, false);
        completedClauses.push(parsed);
        lastCutIndex = cutEnd;
      }
    }

    if (lastCutIndex > 0) {
      this.buffer = this.buffer.substring(lastCutIndex);
    }

    return completedClauses;
  }

  /**
   * Flushes any remaining text in the buffer as the final terminal clause.
   */
  public flushRemaining(): ConversationalClause | null {
    const raw = this.buffer.trim();
    this.buffer = "";
    if (!raw) return null;
    return this._parseClause(raw, true);
  }

  private _parseClause(rawText: string, isTerminal: boolean): ConversationalClause {
    // 1. Extract inline gesture directives e.g. [hands_open], [listen_tilt], [breaking_alert]
    let cleanText = rawText;
    let gestureTag: string | undefined = undefined;

    const gestureMatch = rawText.match(/\[([a-zA-Z0-9_\-]+)\]/);
    if (gestureMatch) {
      const tag = gestureMatch[1].toLowerCase();
      if (GESTURE_TO_ACTION_LOOP_MAP[tag]) {
        gestureTag = tag;
        this.currentActionLoop = GESTURE_TO_ACTION_LOOP_MAP[tag];
      }
      cleanText = rawText.replace(/\[[a-zA-Z0-9_\-]+\]/g, "").trim();
    }

    // 2. Estimate duration based on standard 150 words per minute cadence
    const words = cleanText.split(/\s+/).filter(Boolean).length;
    const estimatedDurationSec = Math.max(1.0, Math.round((words / 2.5) * 10) / 10);

    const clause: ConversationalClause = {
      index: this.clauseIndex++,
      text: cleanText,
      gestureTag,
      actionLoopId: this.currentActionLoop,
      isTerminal,
      estimatedDurationSec,
    };

    return clause;
  }

  /**
   * Resets the director state for a new conversational turn.
   */
  public reset(): void {
    this.buffer = "";
    this.clauseIndex = 0;
    this.currentActionLoop = "ruby_idle";
  }
}
