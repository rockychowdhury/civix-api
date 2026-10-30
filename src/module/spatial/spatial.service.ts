import { prisma } from "../../lib/prisma";

export class SpatialService {
  /**
   * Calculate distance between two coordinates in meters using Haversine formula.
   */
  private static calculateDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Find nearby active civic issue for duplicate detection within threshold (e.g. 50 meters, 7 days).
   */
  static async findDuplicateCivicIssue(params: {
    municipalityId: string;
    categoryId?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    wardId?: string | null;
  }) {
    if (!params.latitude || !params.longitude || !params.categoryId) {
      // Fallback to ward-based query if coordinates missing
      if (!params.wardId || !params.categoryId) return null;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return prisma.civicIssue.findFirst({
        where: {
          municipalityId: params.municipalityId,
          categoryId: params.categoryId,
          wardId: params.wardId,
          createdAt: { gte: sevenDaysAgo },
          status: {
            notIn: ["RESOLVED", "CLOSED", "REJECTED", "CANCELLED", "DUPLICATE"],
          },
        },
        orderBy: { createdAt: "desc" },
        include: { priority: true, location: true },
      });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Fetch active issues in the same municipality and category created within 7 days with location data
    const candidateIssues = await prisma.civicIssue.findMany({
      where: {
        municipalityId: params.municipalityId,
        categoryId: params.categoryId,
        createdAt: { gte: sevenDaysAgo },
        status: {
          notIn: ["RESOLVED", "CLOSED", "REJECTED", "CANCELLED", "DUPLICATE"],
        },
        location: {
          isNot: null,
        },
      },
      include: { priority: true, location: true },
      take: 50,
      orderBy: { createdAt: "desc" },
    });

    // Check distance for each candidate
    for (const issue of candidateIssues) {
      if (issue.location?.latitude && issue.location?.longitude) {
        const distance = SpatialService.calculateDistanceMeters(
          params.latitude,
          params.longitude,
          issue.location.latitude,
          issue.location.longitude
        );

        // Within 50 meters is considered a duplicate point
        if (distance <= 50) {
          return issue;
        }
      }
    }

    return null;
  }
}
