import { describe, it, expect, vi, beforeEach } from "vitest";
import { scrapeArticle } from "./articleScraper";

// We test the scraper with mocked fetch responses

describe("Article Scraper", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should extract article content from HTML", async () => {
    const mockHtml = `
      <html>
        <head><title>Test Article</title></head>
        <body>
          <article>
            <h1>Test Article Title</h1>
            <p>By Test Author</p>
            <p>This is the first paragraph of a test article about technology and innovation.
            It contains enough text to pass the minimum content threshold for Readability extraction.
            The article discusses various aspects of modern technology including artificial intelligence,
            machine learning, and their applications in everyday life. This paragraph continues with
            more details about the topic to ensure we have sufficient content for testing purposes.
            We want to make sure the content extraction works correctly with realistic text lengths.</p>
            <p>Second paragraph continues the discussion with additional information about how
            these technologies are being used in various industries. From healthcare to finance,
            the impact is being felt across all sectors of the economy.</p>
          </article>
        </body>
      </html>
    `;

    global.fetch = vi.fn()
      // First call: robots.txt
      .mockResolvedValueOnce(
        new Response("User-agent: *\nAllow: /", { status: 200 })
      )
      // Second call: actual page
      .mockResolvedValueOnce(new Response(mockHtml, { status: 200 }));

    const result = await scrapeArticle("https://example.com/test-article");

    expect(result.success).toBe(true);
    expect(result.article).toBeDefined();
    expect(result.article!.content.length).toBeGreaterThan(100);
    expect(result.fallbackUsed).toBe(false);
  });

  it("should fallback to RSS description when scraping fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const result = await scrapeArticle(
      "https://example.com/broken",
      "This is the RSS fallback description"
    );

    expect(result.fallbackUsed).toBe(true);
    expect(result.article).toBeDefined();
    expect(result.article!.content).toBe("This is the RSS fallback description");
  });

  it("should respect robots.txt disallow", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      new Response("User-agent: *\nDisallow: /", { status: 200 })
    );

    const result = await scrapeArticle(
      "https://blocked-site.com/article",
      "Fallback content"
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("robots.txt");
    expect(result.fallbackUsed).toBe(true);
  });

  it("should return failure with no fallback when no RSS description", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Timeout"));

    const result = await scrapeArticle("https://example.com/timeout");

    expect(result.success).toBe(false);
    expect(result.fallbackUsed).toBe(false);
    expect(result.article).toBeUndefined();
  });
});
