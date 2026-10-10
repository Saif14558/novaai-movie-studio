
const REPLICATE_API = "https://api.replicate.com/v1";

function send(res, status, data) {
  res.status(status).json(data);
}

function extractVideo(output) {
  if (typeof output === "string") return output;

  if (Array.isArray(output)) {
    return output.find((item) => typeof item === "string") || "";
  }

  if (output && typeof output.url === "string") {
    return output.url;
  }

  return "";
}

export default async function handler(req, res) {
  if (!["POST", "GET"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return send(res, 405, { error: "Method not allowed." });
  }

  const token = process.env.REPLICATE_API_TOKEN;

  if (!token) {
    return send(res, 500, {
      error: "Video API is not configured in Vercel."
    });
  }

  try {
    let endpoint;
    let options = {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      cache: "no-store"
    };

    if (req.method === "POST") {
      const prompt = req.body?.prompt;

      if (
        typeof prompt !== "string" ||
        !prompt.trim() ||
        prompt.length > 4000
      ) {
        return send(res, 400, {
          error: "Please provide a valid scene prompt."
        });
      }

      endpoint = `${REPLICATE_API}/models/minimax/video-01/predictions`;

      options.method = "POST";
      options.body = JSON.stringify({
        input: {
          prompt: prompt.trim(),
          prompt_optimizer: true
        }
      });
    } else {
      const id = req.query?.id;

      if (
        typeof id !== "string" ||
        !/^[a-zA-Z0-9_-]+$/.test(id)
      ) {
        return send(res, 400, {
          error: "A valid video job ID is required."
        });
      }

      endpoint = `${REPLICATE_API}/predictions/${encodeURIComponent(id)}`;
      options.method = "GET";
      delete options.headers["Content-Type"];
    }

    const response = await fetch(endpoint, options);
    const result = await response.json();

    if (!response.ok) {
      console.error("Replicate API error:", result);

      return send(res, response.status >= 500 ? 502 : response.status, {
        error:
          typeof result.detail === "string"
            ? result.detail
            : typeof result.error === "string"
              ? result.error
              : "The video provider could not complete the request."
      });
    }

    return send(res, 200, {
      id: result.id,
      status: result.status,
      output: extractVideo(result.output),
      error:
        result.status === "failed"
          ? "Video generation failed. Check your prompt and provider account."
          : result.status === "canceled"
            ? "Video generation was canceled."
            : null
    });
  } catch (error) {
    console.error("NovaAI video error:", error);

    return send(res, 500, {
      error: "Unable to contact the video service. Please try again."
    });
  }
}
