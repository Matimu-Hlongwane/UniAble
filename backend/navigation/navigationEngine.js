const {
  locations,
  getConnections,
} = require("./navigationData");

// These are destinations, not corridors.
// A route must not pass through them to reach another destination.
const NON_TRANSIT_TYPES = new Set([
  "classroom",
  "auditorium",
]);

function calculateAccessibleRoute(startId, destinationId) {
  const start = locations[startId];
  const destination = locations[destinationId];

  if (!start) {
    throw new Error("Starting location not found.");
  }

  if (!destination) {
    throw new Error("Destination not found.");
  }

  if (!start.accessible || !destination.accessible) {
    return null;
  }

  const distances = new Map();
  const previous = new Map();
  const unvisited = new Set(Object.keys(locations));

  for (const id of unvisited) {
    distances.set(id, Infinity);
  }

  distances.set(startId, 0);

  while (unvisited.size > 0) {
    let currentId = null;
    let shortestDistance = Infinity;

    for (const id of unvisited) {
      const distance = distances.get(id);

      if (distance < shortestDistance) {
        shortestDistance = distance;
        currentId = id;
      }
    }

    if (currentId === null || shortestDistance === Infinity) {
      break;
    }

    if (currentId === destinationId) {
      break;
    }

    unvisited.delete(currentId);

    const edges = getConnections(currentId);

    for (const edge of edges) {
      if (!edge || !edge.accessible) {
        continue;
      }

      if (
        typeof edge.distance !== "number" ||
        !Number.isFinite(edge.distance) ||
        edge.distance < 0
      ) {
        throw new Error("Invalid connection distance.");
      }

      let nextId;

      if (edge.from === currentId) {
        nextId = edge.to;
      } else if (edge.to === currentId) {
        nextId = edge.from;
      } else {
        continue;
      }

      if (!unvisited.has(nextId)) {
        continue;
      }

      const nextLocation = locations[nextId];

      if (!nextLocation || !nextLocation.accessible) {
        continue;
      }

      // Do not use classrooms or auditoriums as corridors.
      // They can still be the requested starting point or destination.
      if (
        nextId !== destinationId &&
        NON_TRANSIT_TYPES.has(nextLocation.type)
      ) {
        continue;
      }

      const newDistance = shortestDistance + edge.distance;

      if (newDistance < distances.get(nextId)) {
        distances.set(nextId, newDistance);
        previous.set(nextId, currentId);
      }
    }
  }

  if (distances.get(destinationId) === Infinity) {
    return null;
  }

  const route = [];
  let currentId = destinationId;

  while (currentId !== undefined) {
    const location = locations[currentId];

    if (!location) {
      throw new Error("Invalid location in route.");
    }

    route.unshift(location);

    if (currentId === startId) {
      break;
    }

    currentId = previous.get(currentId);
  }

  if (
    route.length === 0 ||
    route[0].id !== startId ||
    route[route.length - 1].id !== destinationId
  ) {
    return null;
  }

  return {
    route,
    distanceMeters: distances.get(destinationId),
    accessible: true,
  };
}

module.exports = {
  calculateAccessibleRoute,
};
