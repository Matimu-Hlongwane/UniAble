import { locations, getConnections } from "./navigationData.js";

const NON_TRANSIT_TYPES = new Set([
  "classroom",
  "auditorium",
  "office",
  "service",
  "study",
  "meeting",
  "medical",
  "technical",
  "storage",
  "lab",
  "restroom",
]);

export function calculateAccessibleRoute(startId, destinationId) {
  const start = locations[startId];
  const destination = locations[destinationId];

  if (!start) throw new Error("Starting location not found.");
  if (!destination) throw new Error("Destination not found.");

  if (start.accessible === false || destination.accessible === false) {
    return null;
  }

  const distances = {};
  const previous = {};
  const unvisited = new Set(Object.keys(locations));

  for (const id of unvisited) {
    distances[id] = Infinity;
  }

  distances[startId] = 0;

  while (unvisited.size > 0) {
    let currentId = null;
    let shortestDistance = Infinity;

    for (const id of unvisited) {
      if (distances[id] < shortestDistance) {
        shortestDistance = distances[id];
        currentId = id;
      }
    }

    if (currentId === null) break;
    if (currentId === destinationId) break;

    unvisited.delete(currentId);

    for (const edge of getConnections(currentId)) {
      if (!edge || edge.accessible === false) continue;

      const nextId =
        edge.from === currentId ? edge.to :
        edge.to === currentId ? edge.from :
        null;

      if (!nextId || !unvisited.has(nextId)) continue;

      const nextLocation = locations[nextId];

      if (!nextLocation || nextLocation.accessible === false) continue;

      if (
        nextId !== destinationId &&
        NON_TRANSIT_TYPES.has(nextLocation.type)
      ) {
        continue;
      }

      if (
        typeof edge.distance !== "number" ||
        !Number.isFinite(edge.distance) ||
        edge.distance < 0
      ) {
        throw new Error(
          `Invalid distance on ${edge.from} -> ${edge.to}`
        );
      }

      const newDistance = shortestDistance + edge.distance;

      if (newDistance < distances[nextId]) {
        distances[nextId] = newDistance;
        previous[nextId] = currentId;
      }
    }
  }

  if (!Number.isFinite(distances[destinationId])) {
    return null;
  }

  const route = [];
  let currentId = destinationId;

  while (currentId !== undefined) {
    route.unshift(locations[currentId]);

    if (currentId === startId) break;

    currentId = previous[currentId];
  }

  if (
    route[0]?.id !== startId ||
    route[route.length - 1]?.id !== destinationId
  ) {
    return null;
  }

  return {
    route,
    distanceMeters: distances[destinationId],
    accessible: true,
  };
}
