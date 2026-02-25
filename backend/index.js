require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { dbRun, dbGet, dbAll } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

// Config
app.use(cors());
app.use(express.json());

// Rate Limiting (per IP)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use(limiter);

// Load Docs
const docsPath = path.join(__dirname, 'docs.json');
let docsData = [];
try {
    const rawData = fs.readFileSync(docsPath, 'utf8');
    docsData = JSON.parse(rawData);
} catch (error) {
    console.error("Error loading docs.json:", error);
}

const docsText = docsData.map(doc => `Title: ${doc.title}\nContent: ${doc.content}`).join('\n\n');

// Init Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Create System Instruction / Prompt template function
const generatePrompt = (docsContent, chatHistory, userMessage) => {
    return `
You are a highly capable and intelligent AI assistant. You have all the abilities of a state-of-the-art language model.
You can answer general knowledge questions, write code, solve complex problems, brainstorm ideas, and chat naturally.
If the user specifically asks about the product, use the provided documentation. Otherwise, use your vast general knowledge to answer any question they throw at you!

Product Documentation Reference:
"""
${docsContent}
"""

Recent Chat History:
"""
${chatHistory}
"""

Current User Question:
"${userMessage}"

Rules:
1. Be extremely helpful, smart, and friendly.
2. Use Markdown formatting (bolding, lists, code blocks) to make your answers easy to read.
3. If the question is about our product, rely on the Product Documentation Reference.
4. If it is NOT about the product, unleash your full capabilities and answer the user's general question perfectly!

Assistant Response:`;
};

// --- Endpoints ---

// A. Chat Endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { sessionId, message } = req.body;

        if (!sessionId || !message) {
            return res.status(400).json({ error: "Missing sessionId or message" });
        }

        // 1. Ensure session exists or create it
        const session = await dbGet("SELECT id FROM sessions WHERE id = ?", [sessionId]);
        if (!session) {
            await dbRun("INSERT INTO sessions (id, created_at, updated_at) VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)", [sessionId]);
        } else {
            await dbRun("UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", [sessionId]);
        }

        // 2. Fetch last 5 message pairs (max 10 rows) for context
        const recentMessages = await dbAll(
            "SELECT role, content FROM messages WHERE session_id = ? ORDER BY id DESC LIMIT 10",
            [sessionId]
        );

        // Reverse to chronological order and format
        recentMessages.reverse();
        const chatHistory = recentMessages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content} `).join('\n');

        // 3. Save User Message
        await dbRun("INSERT INTO messages (session_id, role, content) VALUES (?, 'user', ?)", [sessionId, message]);

        // 4. Call LLM
        const prompt = generatePrompt(docsText, chatHistory, message);

        let replyText = "";
        let tokensUsed = 0;

        try {
            if (!process.env.GEMINI_API_KEY) {
                throw new Error("Missing GEMINI_API_KEY");
            }

            const result = await model.generateContent(prompt);
            const response = await result.response;
            replyText = response.text().trim();

            // Attempt to get token usage if available in SDK
            if (response.usageMetadata) {
                tokensUsed = response.usageMetadata.totalTokenCount || 0;
            }
        } catch (llmError) {
            console.error("LLM Error:", llmError);
            // Fallback in case of lack of creds or LLM drop
            replyText = "Sorry, I'm currently unable to process your request due to an AI service error. Please ensure GEMINI_API_KEY is configured.";
        }

        // 5. Save Assistant Message
        await dbRun("INSERT INTO messages (session_id, role, content) VALUES (?, 'assistant', ?)", [sessionId, replyText]);

        // 6. Return response
        res.json({ reply: replyText, tokensUsed });
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// B. Fetch Conversation
app.get('/api/conversations/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        if (!sessionId) {
            return res.status(400).json({ error: "Missing sessionId" });
        }

        const messages = await dbAll(
            "SELECT id, role, content, created_at FROM messages WHERE session_id = ? ORDER BY id ASC",
            [sessionId]
        );

        res.json({ sessionId, messages });
    } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ error: "Failed to fetch conversation" });
    }
});

// C. List Sessions
app.get('/api/sessions', async (req, res) => {
    try {
        const sessions = await dbAll("SELECT id, updated_at FROM sessions ORDER BY updated_at DESC");
        res.json({ sessions });
    } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ error: "Failed to list sessions" });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});
