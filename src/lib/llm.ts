import config from "../config";

export interface LLMRoutingInput {
	description: string;
	categories: {
		id: string;
		name: string;
		departmentId?: string | null;
		departmentName?: string;
	}[];
}

export interface LLMRoutingOutput {
	categoryId: string | null;
	departmentId: string | null;
	confidence: number;
	reasoning: string;
}

export class LLMClient {
	private static instance: LLMClient;
	private provider: string;
	private apiKey: string;
	private model: string;

	private constructor() {
		this.provider = (config.llm_provider || "gemini").toLowerCase();
		this.apiKey = config.llm_api_key || "";
		this.model = config.llm_model || "gemini-1.5-flash";
	}

	public static getInstance(): LLMClient {
		if (!LLMClient.instance) {
			LLMClient.instance = new LLMClient();
		}
		return LLMClient.instance;
	}

	/**
	 * Send description and categories to LLM to detect the right category and department.
	 */
	public async classifyIssue(input: LLMRoutingInput): Promise<LLMRoutingOutput> {
		const { description, categories } = input;

		if (!this.apiKey || categories.length === 0) {
			return this.fallbackHeuristic(description, categories);
		}

		try {
			if (this.provider === "gemini") {
				return await this.callGemini(description, categories);
			}
			return this.fallbackHeuristic(description, categories);
		} catch (error) {
			console.error("LLM classification error, falling back to heuristic:", error);
			return this.fallbackHeuristic(description, categories);
		}
	}

	private async callGemini(
		description: string,
		categories: LLMRoutingInput["categories"]
	): Promise<LLMRoutingOutput> {
		const categoriesPrompt = categories
			.map(
				(c) =>
					`- ID: "${c.id}", Name: "${c.name}", Department: "${c.departmentName || "General"}", DepartmentID: "${c.departmentId || ""}"`
			)
			.join("\n");

		const systemInstruction = `You are a municipal dispatch assistant. 
Given a citizen's problem description, categorize it accurately into one of the provided categories and identify its responsible department.
If the description clearly matches a category, return confidence between 0.8 and 1.0.
If the description is vague, ambiguous, or doesn't belong to any provided category, return confidence < 0.6 and set categoryId to null and departmentId to null.

Respond ONLY with valid JSON in this exact structure:
{
  "categoryId": string or null,
  "departmentId": string or null,
  "confidence": number,
  "reasoning": string
}`;

		const prompt = `Citizen Problem Description: "${description}"

Available Categories:
${categoriesPrompt}`;

		const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				contents: [{ parts: [{ text: prompt }] }],
				systemInstruction: { parts: [{ text: systemInstruction }] },
				generationConfig: {
					responseMimeType: "application/json",
					temperature: 0.1,
				},
			}),
		});

		if (!response.ok) {
			const errText = await response.text();
			console.warn(`Gemini API returned status ${response.status}: ${errText}`);
			return this.fallbackHeuristic(description, categories);
		}

		const data = await response.json();
		const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

		if (!rawText) {
			return this.fallbackHeuristic(description, categories);
		}

		const parsed = JSON.parse(rawText.trim());

		// Verify categoryId exists in provided categories
		const validCategory = categories.find((c) => c.id === parsed.categoryId);
		if (!validCategory || (parsed.confidence && parsed.confidence < 0.7)) {
			return {
				categoryId: null,
				departmentId: null,
				confidence: parsed.confidence || 0.4,
				reasoning: parsed.reasoning || "Low confidence; held for manual review.",
			};
		}

		return {
			categoryId: validCategory.id,
			departmentId: validCategory.departmentId || parsed.departmentId || null,
			confidence: parsed.confidence || 0.85,
			reasoning: parsed.reasoning || "Categorized by Gemini model.",
		};
	}

	private fallbackHeuristic(
		description: string,
		categories: LLMRoutingInput["categories"]
	): LLMRoutingOutput {
		const lowerDesc = description.toLowerCase();
		let bestMatch: (typeof categories)[0] | null = null;
		let maxScore = 0;

		for (const cat of categories) {
			let score = 0;
			const catName = cat.name.toLowerCase();

			if (lowerDesc.includes(catName)) {
				score += 3;
			}

			const words = catName.split(/\s+/);
			for (const w of words) {
				if (w.length > 3 && lowerDesc.includes(w)) {
					score += 1;
				}
			}

			if (score > maxScore) {
				maxScore = score;
				bestMatch = cat;
			}
		}

		const confidence = maxScore >= 3 ? 0.85 : maxScore > 0 ? 0.65 : 0.2;

		if (bestMatch && confidence >= 0.75) {
			return {
				categoryId: bestMatch.id,
				departmentId: bestMatch.departmentId || null,
				confidence,
				reasoning: `Matched via keyword heuristic on category '${bestMatch.name}'.`,
			};
		}

		return {
			categoryId: null,
			departmentId: null,
			confidence,
			reasoning: "Score is low; queued for manual review.",
		};
	}
}

export const llmClient = LLMClient.getInstance();

