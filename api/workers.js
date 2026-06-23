import { prisma } from "./_shared.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const workers = await prisma.worker.findMany({
        orderBy: { firstName: "asc" },
        include: {
          ratings: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      });
      return res.json(workers);
    } catch (error) {
      console.error("Failed to fetch workers:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // PATCH — update worker availability/verification (expects ?id=123)
  if (req.method === "PATCH") {
    try {
      const workerId = parseInt(req.query.id, 10);
      if (!workerId) {
        return res.status(400).json({ error: "Missing worker id query parameter" });
      }

      const { isAvailable, isVerified } = req.body;

      const data = {};
      if (isAvailable !== undefined) data.isAvailable = isAvailable;
      if (isVerified !== undefined) data.isVerified = isVerified;

      const updatedWorker = await prisma.worker.update({
        where: { id: workerId },
        data,
      });

      return res.json(updatedWorker);
    } catch (error) {
      console.error("Failed to update worker:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  // PUT — activate worker with full profile (expects ?id=123)
  if (req.method === "PUT") {
    try {
      const workerId = parseInt(req.query.id, 10);
      if (!workerId) {
        return res.status(400).json({ error: "Missing worker id query parameter" });
      }

      const { firstName, phone, subCity, category } = req.body;

      if (!phone || !subCity || !category || !Array.isArray(category) || category.length === 0) {
        return res.status(400).json({ error: "Phone, sub-city, and at least one specialty are required" });
      }

      const data = {
        phone: phone.trim(),
        subCity: subCity.trim(),
        category,
        isVerified: true,
        isAvailable: true,
      };
      if (firstName) data.firstName = firstName.trim();

      const updatedWorker = await prisma.worker.update({
        where: { id: workerId },
        data,
      });

      return res.json(updatedWorker);
    } catch (error) {
      console.error("Failed to activate worker:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
