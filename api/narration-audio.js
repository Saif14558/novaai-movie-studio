
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Use POST to generate narration."
    });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "The narration API key is not configured in Vercel."
    });
  }

  const text = typeof req.body?.text === "string"
    ? req.body.text.trim()
    : "";

  if (!text) {
    return res.status(400).json({
      error: "Please enter narration text."
    });
  }

  if (text.length > 2500) {
    return res.status(400).json({
      error: "Please keep narration under 2500 characters."
    });
  }

  try {
    const response = await fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb?output_format=mp3_44100_128",
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2"
        })
      }
    );

    if (!response.ok) {
      const details = await response.text();
      console.error("Narration provider error:", details);

      return res.status(502).json({
        error: "Audio generation failed. Check your API key, account credits, and voice access."
      });
    }

    const audioBuffer = Buffer.from(
      await response.arrayBuffer()
    );

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="novaai-narration.mp3"'
    );
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).send(audioBuffer);
  } catch (error) {
    console.error("Narration error:", error);

    return res.status(500).json({
      error: "Could not generate narration. Please try again."
    });
  }
}
