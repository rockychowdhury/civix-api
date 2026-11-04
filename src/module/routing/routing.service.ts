import { prisma } from "../../lib/prisma";
import { llmClient } from "../../lib/llm";

interface RouteResult {
  categoryId: string | null;
  departmentId: string | null;
  confidence: number;
  reasoning: string;
}

export class RoutingService {
  /**
   * Automatically route a request description to the correct category and department
   * using the singleton LLM client with fallback heuristic.
   * If confidence is low or no category fits, departmentId and categoryId are set to null (queued for manual review).
   */
  static async classifyAndRoute(
    municipalityId: string,
    description: string,
    suggestedCategoryId?: string
  ): Promise<RouteResult> {
    const categories = await prisma.serviceCategory.findMany({
      where: { isActive: true },
      include: { department: true },
    });

    if (categories.length === 0) {
      return {
        categoryId: null,
        departmentId: null,
        confidence: 0.0,
        reasoning: "No active categories found in the system.",
      };
    }

    // If client supplied a valid categoryId (e.g. backward compat), verify and use it
    if (suggestedCategoryId) {
      const match = categories.find((c) => c.id === suggestedCategoryId);
      if (match) {
        return {
          categoryId: match.id,
          departmentId: match.departmentId || null,
          confidence: 1.0,
          reasoning: "Explicitly selected by user/client.",
        };
      }
    }

    // Call singleton LLM Client
    const llmInput = {
      description,
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        departmentId: c.departmentId,
        departmentName: c.department?.name,
      })),
    };

    const result = await llmClient.classifyIssue(llmInput);

    return {
      categoryId: result.categoryId,
      departmentId: result.departmentId,
      confidence: result.confidence,
      reasoning: result.reasoning,
    };
  }
}
