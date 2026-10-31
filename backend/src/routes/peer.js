import { Router } from "express";
import crypto from "node:crypto";
import { store } from "../services/store.js";

const router = Router();

router.get("/requests", (req, res) => res.json({ requests: store.requests }));

router.post("/requests", (req, res) => {
  const {
    studentId = "student-001",
    type = "General assistance",
    detail = "",
    location = "Unknown",
    priority = "Normal",
  } = req.body;

  const item = {
    id: crypto.randomUUID(),
    student: studentId,
    type,
    detail,
    location,
    priority,
    status: "open",
    time: "just now",
  };

  store.requests.unshift(item);
  res.status(201).json({ request: item });
});

router.patch("/requests/:id", (req, res) => {
  const item = store.requests.find((x) => x.id === req.params.id);

  if (!item) return res.status(404).json({ message: "Request not found" });
  if (!["open", "accepted", "declined", "completed"].includes(req.body.status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  item.status = req.body.status;
  res.json({ request: item });
});

router.get("/volunteers", (req, res) => {
  res.json({ volunteers: store.volunteers });
});

// Register a student as a volunteer. Repeated registration is safe.
router.post("/volunteers/register", (req, res) => {
  const { userId, name } = req.body;

  if (!userId || !name?.trim()) {
    return res.status(400).json({ message: "User ID and name are required." });
  }

  let volunteer = store.volunteers.find((item) => item.id === userId);

  if (volunteer) {
    volunteer.name = name.trim();
    return res.json({ volunteer, alreadyRegistered: true });
  }

  volunteer = {
    id: userId,
    name: name.trim(),
    available: true,
  };

  store.volunteers.push(volunteer);
  res.status(201).json({ volunteer, alreadyRegistered: false });
});

router.patch("/volunteers/:id/availability", (req, res) => {
  const volunteer = store.volunteers.find((x) => x.id === req.params.id);

  if (!volunteer) {
    return res.status(404).json({ message: "Volunteer not found" });
  }

  volunteer.available = Boolean(req.body.available);
  res.json({ volunteer });
});

export default router;
