import { prisma } from "./_shared.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const totalJobs = await prisma.job.count();
    const activeJobs = await prisma.job.count({
      where: { status: { in: ["PENDING", "ASSIGNED", "IN_PROGRESS"] } },
    });
    const completedJobs = await prisma.job.count({
      where: { status: "COMPLETED" },
    });
    const disputedJobs = await prisma.job.count({
      where: { status: "DISPUTED" },
    });

    const revenueAggregate = await prisma.job.aggregate({
      where: { status: "COMPLETED" },
      _sum: { finalPrice: true },
    });
    const totalRevenue = revenueAggregate._sum.finalPrice || 0;

    const ratingAggregate = await prisma.rating.aggregate({
      _avg: { score: true },
    });
    const avgRating = ratingAggregate._avg.score || 5.0;

    res.json({
      totalJobs,
      activeJobs,
      completedJobs,
      disputedJobs,
      totalRevenue,
      avgRating: parseFloat(avgRating.toFixed(1)),
    });
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
