const express = require("express");
const path = require("path");

const {
  calculateAccessibleRoute,
} = require(path.join(__dirname, "navigation", "navigationEngine"));

const {
  locations,
  getConnections,
  getSelectableLocations,
} = require(path.join(__dirname, "navigation", "navigationData"));

const app = express();
const PORT = 5000;

app.use(express.json());

// ============================================================
// CORS
// ============================================================

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "UniAble backend is running!",
  });
});

// ============================================================
// GET NAVIGATION LOCATIONS
// ============================================================

app.get("/api/navigation/locations", (req, res) => {
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
    console.error("Location loading error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load navigation locations.",
      error: error.message,
    });
  }
});

// ============================================================
// CALCULATE ACCESSIBLE ROUTE
// ============================================================

app.get("/api/navigation/route", (req, res) => {
  const start = String(req.query.start || "").trim();
  const destination = String(req.query.destination || "").trim();

  console.log("Route requested:", start, "->", destination);

  // Validate parameters.
  if (!start || !destination) {
    return res.status(400).json({
      success: false,
      message: "Please provide a starting point and destination.",
    });
  }

  // Validate locations.
  if (!locations[start]) {
    return res.status(404).json({
      success: false,
      message: "Starting location was not found.",
      start,
    });
  }

  if (!locations[destination]) {
    return res.status(404).json({
      success: false,
      message: "Destination was not found.",
      destination,
    });
  }

  // Validate accessibility.
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
    // Calculate route.
    const result = calculateAccessibleRoute(start, destination);

    console.log("Navigation engine result:", {
      resultExists: !!result,
      routeIsArray: Array.isArray(result?.route),
      routeLength: result?.route?.length,
      distanceMeters: result?.distanceMeters,
    });

    if (!result || !Array.isArray(result.route) || result.route.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No accessible route was found.",
        debug: {
          start,
          destination,
          result,
        },
      });
    }

    const routeConnections = [];

    // Build directional instructions.
    for (let i = 0; i < result.route.length - 1; i++) {
      const from = result.route[i].id;
      const to = result.route[i + 1].id;

      const connection = getConnections(from).find(edge =>
        (edge.from === from && edge.to === to) ||
        (edge.from === to && edge.to === from)
      );

      if (!connection) {
        throw new Error(
          `Connection missing between ${from} and ${to}.`
        );
      }

      if (connection.accessible === false) {
        throw new Error(
          `Inaccessible connection between ${from} and ${to}.`
        );
      }

      const travellingForward = connection.from === from;

      const instruction = travellingForward
        ? connection.forwardInstruction
        : connection.reverseInstruction;

      if (typeof instruction !== "string" || !instruction.trim()) {
        throw new Error(
          `Instruction missing between ${from} and ${to}.`
        );
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

    // Validate route instructions.
    if (routeConnections.length !== result.route.length - 1) {
      throw new Error("Route instructions are incomplete.");
    }

    // Return successful route.
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
    console.error("Navigation error:", error);

    return res.status(500).json({
      success: false,
      message: "An error occurred while calculating the route.",
      error: error.message,
    });
  }
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log("UniAble backend running on http://localhost:" + PORT);
  console.log("Server file:", __filename);
  console.log("Navigation locations loaded:", Object.keys(locations).length);
});

