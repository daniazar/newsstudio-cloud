import { describe, it, expect } from "vitest";
import { parseCliArgs } from "../../../../../../scripts/image-cli/wizard/cliArgParser";

describe("CLI Arg Parser Unit Tests", () => {
  it("should parse multi-pass and persona flags correctly", () => {
    const args = ["--multi-pass", "--persona", "ruby", "--seed", "12345", "--prompt", "studio newsroom"];
    const parsed = parseCliArgs(args);

    expect(parsed.multiPassFlag).toBe(true);
    expect(parsed.personaArg).toBe("ruby");
    expect(parsed.seedArg).toBe(12345);
    expect(parsed.promptArg).toBe("studio newsroom");
  });

  it("should parse dual persona partner flag correctly", () => {
    const args = ["--persona", "ruby", "--partner", "volt", "--model", "z_image"];
    const parsed = parseCliArgs(args);

    expect(parsed.personaArg).toBe("ruby");
    expect(parsed.partnerArg).toBe("volt");
    expect(parsed.modelArg).toBe("z_image");
  });

  it("should parse short CLI flags (-p, -pp, -m, -mp)", () => {
    const args = ["-mp", "-p", "elena", "-pp", "chloe", "-m", "flux2"];
    const parsed = parseCliArgs(args);

    expect(parsed.multiPassFlag).toBe(true);
    expect(parsed.personaArg).toBe("elena");
    expect(parsed.partnerArg).toBe("chloe");
    expect(parsed.modelArg).toBe("flux2");
  });
});
