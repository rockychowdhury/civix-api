import { prisma } from "../../lib/prisma";

interface RouteResult {
  categoryId: string | null;
  departmentId: string | null;
  confidence: number;
  reasoning: string;
}

export class RoutingService {
  /**
   * Automatically route a request description to the correct category and department
   * using an LLM classifier or intelligent fallback keyword matching.
   */
  static async classifyAndRoute(
    municipalityId: string,
    description: string,
    suggestedCategoryId?: string
  ): Promise<RouteResult> {
    // 1. Fetch all active categories with departments for this municipality or global
    const categories = await prisma.serviceCategory.findMany({
      where: { isActive: true },
      include: { department: true },
    });

    if (categories.length === 0) {
      return {
        categoryId: suggestedCategoryId || null,
        departmentId: null,
        confidence: 0.0,
        reasoning: "No active categories found in the system.",
      };
    }

    // 2. If suggested category ID is valid, verify it
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

    // 3. Simple robust keyword matching fallback (or plug in LLM API call here)
    const lowerDesc = description.toLowerCase();
    let bestMatch = categories[0];
    let maxScore = 0;

    for (const cat of categories) {
      let score = 0;
      const catName = cat.name.toLowerCase();
      const slug = cat.slug.toLowerCase();

      if (lowerDesc.includes(catName) || lowerDesc.includes(slug)) {
        score += 2;
      }

      // Check words
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

    const confidence = maxScore > 0 ? Math.min(0.5 + maxScore * 0.15, 0.95) : 0.3;

    if (confidence >= 0.75) {
      return {
        categoryId: bestMatch.id,
        departmentId: bestMatch.departmentId || null,
        confidence,
        reasoning: `Matched via keyword heuristic on category '${bestMatch.name}'.`,
      };
    }

    // Low confidence -> queue for manual review (departmentId = null)
    return {
      categoryId: suggestedCategoryId || null,
      departmentId: null,
      confidence,
      reasoning: "Low confidence match; routed for manual review.",
    };
  }
}
