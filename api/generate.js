
export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.REPLICATE_API_TOKEN;

  if (!token) {
    return res.status(500).json({
      error: "REPLICATE_API_TOKEN is missing in Vercel settings."
    });
  }

  try {
    let response;

    if (req.method === "POST") {
      const prompt = req.body?.prompt;

      if (typeof prompt !== "string" || !prompt.trim()) {
        return res.status(400).json({
          error: "Please enter a movie scene prompt."
        });
      }

      response = await fetch(
        "https://api.replicate.com/v1/models/minimax/video-01/predictions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            input: {
              prompt: prompt.trim(),
              prompt_optimizer: true
            }
          })
        }
      );
    } else {
      const id = req.query?.id;

      if (typeof id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(id)) {
        return res.status(400).json({
          error: "A valid video job ID is required."
        });
      }

      response = await fetch(
        `https://api.replicate.com/v1/predictions/${encodeURIComponent(id)}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
    }

    const data = await response.json();

    if (!response.ok) {
      console.error("Replicate API error:", data);
      return res.status(502).json({
        error: data.detail || data.error || "Video provider request failed."
      });
    }

    let output = data.output;
    if (Array.isArray(output)) {
      output = output.find((item) => typeof item === "string") || "";
    } else if (output && typeof output === "object") {
      output = output.url || "";
    }

    return res.status(200).json({
      id: data.id,
      status: data.status,
      output: typeof output === "string" ? output : "",
      error: data.status === "failed" ? "Video generation failed." : null
    });
  } catch (error) {
    console.error("NovaAI backend error:", error);
    return res.status(500).json({
      error: "Could not contact the video service. Please try again."
    });
  }
}
