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
   * Find nearby active civic issue for duplicate detection:
   * 1. If roadId is provided:
   *    - Restrict candidate matching to the SAME road within the same ward and category.
   *    - If GPS coordinates are both present, check if within road threshold (<= 75 meters).
   *    - If GPS is absent (e.g. citizen reported from home), group by same road + category within 7 days.
   * 2. If roadId is NOT provided but GPS coordinates exist:
   *    - Check distance threshold (<= 50 meters).
   * 3. Do NOT merge across entire ward if road is different or unknown (prevents false merges).
   */
  static async findDuplicateCivicIssue(params: {
    municipalityId: string;
    categoryId?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    wardId?: string | null;
    roadId?: string | null;
  }) {
    if (!params.categoryId) return null;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 1. Road-level Granular Matching
    if (params.roadId && params.wardId) {
      const activeIssuesOnRoad = await prisma.civicIssue.findMany({
        where: {
          municipalityId: params.municipalityId,
          categoryId: params.categoryId,
          wardId: params.wardId,
          location: {
            roadId: params.roadId,
          },
          createdAt: { gte: sevenDaysAgo },
          status: {
            notIn: ["RESOLVED", "CLOSED", "REJECTED", "CANCELLED", "DUPLICATE"],
          },
        },
        include: { priority: true, location: true },
        orderBy: { createdAt: "desc" },
      });

      if (activeIssuesOnRoad.length > 0) {
        // If citizen provided GPS on spot, verify coordinates are within reasonable street segment (<= 75m)
        if (params.latitude && params.longitude) {
          for (const issue of activeIssuesOnRoad) {
            if (issue.location?.latitude && issue.location?.longitude) {
              const distance = SpatialService.calculateDistanceMeters(
                params.latitude,
                params.longitude,
                issue.location.latitude,
                issue.location.longitude
              );
              if (distance <= 75) {
                return issue;
              }
            } else {
              // Issue on same road has no GPS, match as duplicate on same street
              return issue;
            }
          }
        } else {
          // Citizen reported off-spot (no GPS) for this road -> match to existing active issue on this road
          return activeIssuesOnRoad[0];
        }
      }
    }

    // 2. High-precision GPS Proximity Matching (when coordinates are available)
    if (params.latitude && params.longitude) {
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

      for (const issue of candidateIssues) {
        if (issue.location?.latitude && issue.location?.longitude) {
          const distance = SpatialService.calculateDistanceMeters(
            params.latitude,
            params.longitude,
            issue.location.latitude,
            issue.location.longitude
          );

          // Within 50 meters is considered duplicate spot
          if (distance <= 50) {
            return issue;
          }
        }
      }
    }

    // Notice: We intentionally do NOT fallback to merging purely by wardId alone.
    // A ward has multiple roads and thousands of houses; merging by ward alone causes false duplicates.
    return null;
  }
}
