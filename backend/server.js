const express = require("express");

const {
  calculateAccessibleRoute,
} = require("./navigation/navigationEngine");

const {
  locations,
  getConnections,
  getSelectableLocations,
} = require("./navigation/navigationData");

const app = express();
const PORT = 5000;

app.use(express.json());

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
// BACKEND HEALTH CHECK
// ============================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "UniAble backend is running!",
  });
});

// ============================================================
// GET ACCESSIBLE DESTINATIONS
// ============================================================

app.get("/api/navigation/locations", (req, res) => {
  res.json({
    success: true,
    locations: getSelectableLocations(),
  });
});

// ============================================================
// CALCULATE ACCESSIBLE ROUTE
// ============================================================

app.get("/api/navigation/route", (req, res) => {
  const { start, destination } = req.query;

  // Validate required parameters.
  if (!start || !destination) {
    return res.status(400).json({
      success: false,
      message: "Please provide a starting point and destination.",
    });
  }

  // Validate starting location.
  if (!locations[start]) {
    return res.status(404).json({
      success: false,
      message: "Starting location was not found.",
    });
  }

  // Validate destination.
  if (!locations[destination]) {
    return res.status(404).json({
      success: false,
      message: "Destination was not found.",
    });
  }

  // Validate accessibility.
  if (
    !locations[start].accessible ||
    !locations[destination].accessible
  ) {
    return res.status(403).json({
      success: false,
      message: "This location is not accessible.",
    });
  }

  try {
    const result = calculateAccessibleRoute(
      start,
      destination
    );

    if (!result || !result.route || result.route.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No accessible route was found.",
      });
    }

    const routeConnections = [];

    // Build instructions for every route segment.
    for (
      let i = 0;
      i < result.route.length - 1;
      i++
    ) {
      const from = result.route[i].id;
      const to = result.route[i + 1].id;

      const connection = getConnections(from).find(
        edge =>
          (edge.from === from && edge.to === to) ||
          (edge.from === to && edge.to === from)
      );

      if (!connection) {
        throw new Error(
          `Connection missing between ${from} and ${to}.`
        );
      }

      // Never return instructions for an inaccessible connection.
      if (!connection.accessible) {
        throw new Error(
          `Inaccessible connection between ${from} and ${to}.`
        );
      }

      // Determine the direction of travel.
      const travellingForward = connection.from === from;

      const instruction = travellingForward
        ? connection.forwardInstruction
        : connection.reverseInstruction;

      if (!instruction) {
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
        instruction,
        accessible: connection.accessible,
      });
    }

    // Return the complete route.
    return res.json({
      success: true,

      route: result.route,

      routeNames: result.route.map(location => ({
        id: location.id,
        name: location.name,
        floorId: location.floorId,
      })),

      connections: routeConnections,

      distanceMeters: result.distanceMeters,

      accessible: result.accessible,
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
  console.log(
    `UniAble backend running on http://localhost:${PORT}`
  );
});

