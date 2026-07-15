const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeScreenshot } = require("./ai-vision.js");

test("throws without GEMINI_API_KEY", async () => {
  delete process.env.GEMINI_API_KEY;
  await assert.rejects(() => analyzeScreenshot(Buffer.from("x")), /GEMINI_API_KEY/);
});

test("calls Gemini once then serves from cache, pads to 6 slots", async () => {
  process.env.GEMINI_API_KEY = "test-key";
  let calls = 0;
  const originalFetch = global.fetch;
  global.fetch = async () => {
    calls++;
    return {
      ok: true,
      json: async () => ({
        candidates: [
          { content: { parts: [{ text: JSON.stringify({ pokemon: ["Incineroar", "Rillaboom"] }) }] } },
        ],
      }),
    };
  };

  try {
    const img = Buffer.from("same-bytes");
    const first = await analyzeScreenshot(img);
    const second = await analyzeScreenshot(img);

    assert.equal(calls, 1, "seconda chiamata deve usare la cache, non rifare la fetch");
    assert.deepEqual(first, { pokemon: ["Incineroar", "Rillaboom", null, null, null, null] });
    assert.deepEqual(second, first);
  } finally {
    global.fetch = originalFetch;
  }
});
