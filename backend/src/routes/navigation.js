import { Router } from "express";
import {
  locations,
  getConnections,
  getSelectableLocations,
} from "../navigation/navigationData.js";
import { calculateAccessibleRoute } from "../navigation/navigationEngine.js";
import { requireFirebaseUser } from "../middleware/authMiddleware.js";

const router = Router();

router.use(requireFirebaseUser);

router.get("/locations", (req, res) => {
  try {
    const selectableLocations = getSelectableLocations();

    return res.json({
      success: true,
      locations: selectableLocations.map(location => ({
        ...location,
        accessible: location.accessible !== false,
      })),
    });
  } catch (error) {
    console.error("Navigation location loading error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load campus locations.",
    });
  }
});

router.get("/route", (req, res) => {
  const start = String(req.query.start || "").trim();
  const destination = String(req.query.destination || "").trim();

  if (!start || !destination) {
    return res.status(400).json({
      success: false,
      message: "Please provide a starting point and destination.",
    });
  }

  if (!locations[start]) {
    return res.status(404).json({
      success: false,
      message: "Starting location was not found.",
    });
  }

  if (!locations[destination]) {
    return res.status(404).json({
      success: false,
      message: "Destination was not found.",
    });
  }

  if (
    locations[start].accessible === false ||
    locations[destination].accessible === false
  ) {
    return res.status(403).json({
      success: false,
      message: "This location is not accessible.",
    });
  }

  if (start === destination) {
    return res.status(400).json({
      success: false,
      message: "You are already at your destination.",
    });
  }

  try {
    const result = calculateAccessibleRoute(start, destination);

    if (!result || !Array.isArray(result.route) || !result.route.length) {
      return res.status(404).json({
        success: false,
        message: "No accessible route was found.",
      });
    }

    const routeConnections = [];

    for (let i = 0; i < result.route.length - 1; i += 1) {
      const from = result.route[i].id;
      const to = result.route[i + 1].id;

      const connection = getConnections(from).find(edge =>
        (edge.from === from && edge.to === to) ||
        (edge.from === to && edge.to === from)
      );

      if (!connection || connection.accessible === false) {
        throw new Error(`Accessible connection missing between ${from} and ${to}.`);
      }

      const travellingForward = connection.from === from;
      const instruction = travellingForward
        ? connection.forwardInstruction
        : connection.reverseInstruction;

      if (typeof instruction !== "string" || !instruction.trim()) {
        throw new Error(`Direction instruction missing between ${from} and ${to}.`);
      }

      routeConnections.push({
        from,
        fromName: locations[from].name,
        to,
        toName: locations[to].name,
        distance: connection.distance,
        instruction: instruction.trim(),
        accessible: true,
      });
    }

    if (routeConnections.length !== result.route.length - 1) {
      throw new Error("Route instructions are incomplete.");
    }

    return res.json({
      success: true,
      route: result.route.map(location => ({
        id: location.id,
        name: location.name,
        type: location.type,
        floorId: location.floorId,
        accessible: location.accessible !== false,
      })),
      routeNames: result.route.map(location => ({
        id: location.id,
        name: location.name,
        floorId: location.floorId,
      })),
      connections: routeConnections,
      distanceMeters: result.distanceMeters,
      accessible: result.accessible === true,
    });
  } catch (error) {
    console.error("Navigation route calculation error:", error);

    return res.status(500).json({
      success: false,
      message: "An error occurred while calculating the route.",
    });
  }
});

export default router;
