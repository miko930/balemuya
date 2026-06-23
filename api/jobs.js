import { prisma, handleJobUpdateNotifications } from "./_shared.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const { status } = req.query;
      const filter = status ? { status } : {};

      const jobs = await prisma.job.findMany({
        where: filter,
        include: {
          customer: true,
          worker: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return res.json(jobs);
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // PATCH — update a specific job (expects ?id=123 in query string)
  if (req.method === "PATCH") {
    try {
      const jobId = parseInt(req.query.id, 10);
      if (!jobId) {
        return res.status(400).json({ error: "Missing job id query parameter" });
      }

      const { status, finalPrice, workerId } = req.body;

      const data = {};
      if (status) data.status = status;
      if (finalPrice !== undefined) data.finalPrice = finalPrice !== null ? parseInt(finalPrice, 10) : null;
      if (workerId !== undefined) data.workerId = workerId !== null ? parseInt(workerId, 10) : null;

      const oldJob = await prisma.job.findUnique({
        where: { id: jobId },
        include: { customer: true, worker: true },
      });

      if (!oldJob) {
        return res.status(404).json({ error: "Job not found" });
      }

      const updatedJob = await prisma.job.update({
        where: { id: jobId },
        data,
        include: { customer: true, worker: true },
      });

      // Send notifications in the background
      handleJobUpdateNotifications(oldJob, updatedJob).catch((err) => {
        console.error("Failed to run status change notifications:", err);
      });

      return res.json(updatedJob);
    } catch (error) {
      console.error("Failed to update job:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
