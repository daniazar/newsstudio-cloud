/**
 * src/lib/ecommerce/amazonLinter.ts
 *
 * Amazon Video TOS Compliance & Regulatory Advertising Linter.
 * Enforces Amazon 7th-slot listing guidelines, FTC influencer disclosures,
 * and FDA cosmetic/supplement disclaimers.
 */

export interface ComplianceViolation {
  term: string;
  category: "banned_claim" | "external_link" | "unsupported_superlative" | "pricing_claim";
  severity: "error" | "warning";
  replacement?: string;
  reason: string;
}

export interface ComplianceReport {
  isCompliant: boolean;
  violations: ComplianceViolation[];
  sanitizedText: string;
  injectedDisclaimers: string[];
}

const BANNED_AMAZON_TERMS: Array<{
  pattern: RegExp;
  term: string;
  category: ComplianceViolation["category"];
  severity: ComplianceViolation["severity"];
  replacement: string;
  reason: string;
}> = [
  {
    pattern: /(?:#1\b|\b(?:number\s*(?:one|1)|world'?s\s*best|top\s*rated)\b)/gi,
    term: "#1 / Best",
    category: "unsupported_superlative",
    severity: "error",
    replacement: "Premium quality",
    reason: "Amazon prohibits unsubstantiated superlative claims.",
  },
  {
    pattern: /\b(?:best\s*seller|bestseller)\b/gi,
    term: "Best seller",
    category: "unsupported_superlative",
    severity: "error",
    replacement: "Popular choice",
    reason: "Amazon prohibits self-referential 'Best Seller' badges in product videos.",
  },
  {
    pattern: /\b(?:cheapest|lowest\s*price|unbeatable\s*price)\b/gi,
    term: "Cheapest / Lowest Price",
    category: "pricing_claim",
    severity: "error",
    replacement: "Great value",
    reason: "Amazon prohibits explicit price guarantee claims that fluctuate.",
  },
  {
    pattern: /\b(?:free\s*shipping)\b/gi,
    term: "Free shipping",
    category: "pricing_claim",
    severity: "error",
    replacement: "Prime eligible",
    reason: "Shipping offers depend on buyer Prime membership and cannot be hardcoded.",
  },
  {
    pattern: /\b(?:visit\s*(?:our\s*)?(?:site|website|store)|www\.[a-z0-9\-\.]+\.[a-z]{2,}|[a-z0-9\-\.]+\.com)\b/gi,
    term: "External URL / Website",
    category: "external_link",
    severity: "error",
    replacement: "Available on Amazon",
    reason: "Amazon strictly forbids directing traffic off-platform.",
  },
  {
    pattern: /\b(?:100%\s*money\s*back\s*guarantee|satisfaction\s*guaranteed\s*or\s*money\s*back)\b/gi,
    term: "Money Back Guarantee",
    category: "banned_claim",
    severity: "warning",
    replacement: "Backed by warranty",
    reason: "Money-back claims must conform to Amazon's standard A-to-z return policy.",
  },
];

export interface LintOptions {
  channel?: string;
  isSupplementOrCosmetic?: boolean;
  isPaidSponsorship?: boolean;
}

/**
 * Lints copy for compliance and generates a sanitized version.
 */
export function lintAdCopy(rawText: string, options: LintOptions = {}): ComplianceReport {
  let sanitized = rawText;
  const violations: ComplianceViolation[] = [];
  const injectedDisclaimers: string[] = [];

  // Check Amazon compliance if target channel is Amazon
  const isAmazon = options.channel === "amazon_listing";

  for (const rule of BANNED_AMAZON_TERMS) {
    if (rule.pattern.test(sanitized)) {
      violations.push({
        term: rule.term,
        category: rule.category,
        severity: isAmazon ? rule.severity : "warning",
        replacement: rule.replacement,
        reason: rule.reason,
      });

      if (isAmazon) {
        sanitized = sanitized.replace(rule.pattern, rule.replacement);
      }
    }
  }

  // FTC Disclosures for Social Ads
  if (options.isPaidSponsorship) {
    injectedDisclaimers.push("#AD");
    injectedDisclaimers.push("PAID PARTNERSHIP");
  }

  // FDA Disclaimers for Supplements / Skincare
  if (options.isSupplementOrCosmetic) {
    injectedDisclaimers.push(
      "These statements have not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease."
    );
  }

  const hasErrors = violations.some((v) => v.severity === "error");

  return {
    isCompliant: isAmazon ? !hasErrors : true,
    violations,
    sanitizedText: sanitized,
    injectedDisclaimers,
  };
}
