const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json({ limit: '50mb' }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const API_KEY = process.env.ANTHROPIC_API_KEY;

app.post('/scan-text', async (req, res) => {"type":"CROSSFIT","title":"workout name","exercises":[{"name":"Pull-ups","reps":"10","weight":null},{"name":"Push-ups","reps":"15","weight":null},{"name":"Air Squats","reps":"20","weight":null},{"name":"Box Jumps","reps":"10","weight":"60cm"}],"timecap":"20 min","rounds":"5","notes":"Rest 1 min between rounds"}
  try {
    const { text } = req.body;
    console.log('Scanning text:', text?.substring(0, 80));
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are reading a gym workout. Return ONLY a valid JSON object, no other text, no markdown, no backticks:\n{"type":"CROSSFIT","title":"workout name","exercises":[{"name":"Pull-ups","reps":"10","weight":null},{"name":"Push-ups","reps":"15","weight":null},{"name":"Air Squats","reps":"20","weight":null},{"name":"Box Jumps","reps":"10","weight":"60cm"}],"timecap":"20 min","rounds":"5","notes":"Rest 1 min between rounds"}
        }]
      })
    });
    const data = await response.json();
    console.log('Response:', JSON.stringify(data).substring(0, 300));
    if (data.error) return res.status(500).json({ error: data.error.message });
    const raw = data.content?.[0]?.text || '';
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    res.json(parsed);
  } catch (e) {
    console.error('scan-text error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/scan-image', async (req, res) => {
  try {
    const { base64 } = req.body;
    console.log('Scanning image, size:', base64?.length);

    // Detect mime type from base64
    let mime = 'image/jpeg';
    if (base64 && base64.length > 4) {
      const bytes = Buffer.from(base64.substring(0, 12), 'base64');
      if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E) {
        mime = 'image/png';
      } else if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
        mime = 'image/jpeg';
      } else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46) {
        mime = 'image/webp';
      }
    }
    console.log('Detected mime:', mime);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mime, data: base64 }
            },
            {
              type: 'text',
              text: 'Read the workout written on this gym whiteboard or billboard. Return ONLY a valid JSON object, no other text, no markdown, no backticks:\n{"type":"CROSSFIT","title":"workout name","exercises":[{"name":"Pull-ups","reps":"10","weight":null}],"timecap":null,"rounds":null,"notes":null}\n\nIf no workout text is visible return: {"error":"No workout found"}'
            }
          ]
        }]
      })
    });
    const data = await response.json();
    console.log('Image response:', JSON.stringify(data).substring(0, 400));
    if (data.error) return res.status(500).json({ error: data.error.message });
    const raw = data.content?.[0]?.text || '';
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    res.json(parsed);
  } catch (e) {
    console.error('scan-image error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', key: !!API_KEY }));
app.get('/', (req, res) => res.json({ status: 'LADEN server v3' }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('LADEN server on port', PORT));
