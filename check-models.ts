import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("GEMINI_API_KEY is missing!");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    console.log("Fetching available models...");

    try {
        // Need to use the generic client to list models if possible, 
        // or just try to instantiate models and catch errors. 
        // Unfortunately standard SDK doesn't expose listModels easily in node without full admin SDK sometimes,
        // but let's try a direct fetch to the REST API for clarity if SDK fails.

        // Actually, let's just use a simple fetch to the API endpoint which is more reliable for debugging raw key access
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log("✅ Models found accessible by your key:");
            data.models.forEach((m: any) => {
                if (m.name.includes("gemini")) {
                    console.log(`- ${m.name} (Supported: ${m.supportedGenerationMethods})`);
                }
            });
        } else {
            console.error("❌ No models found or error:", data);
        }

    } catch (error) {
        console.error("❌ Error listing models:", error);
    }
}

listModels();
