import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore'

import { db } from '../firebase'

// ============================================================
// FIREBASE DATA
// ============================================================

export const getCampuses = async (universityId) => {
  const ref = collection(db, 'campuses')
  const q = query(ref, where('universityId', '==', universityId))
  const snapshot = await getDocs(q)

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }))
}

export const getBuildings = async (campusId) => {
  const ref = collection(db, 'buildings')
  const q = query(ref, where('campusId', '==', campusId))
  const snapshot = await getDocs(q)

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }))
}

export const getFloors = async (buildingId) => {
  const ref = collection(db, 'floors')
  const q = query(ref, where('buildingId', '==', buildingId))
  const snapshot = await getDocs(q)

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }))
}

export const getLocations = async (floorId) => {
  const ref = collection(db, 'locations')
  const q = query(ref, where('floorId', '==', floorId))
  const snapshot = await getDocs(q)

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }))
}

export const getConnections = async (floorId) => {
  const ref = collection(db, 'connections')
  const q = query(ref, where('floorId', '==', floorId))
  const snapshot = await getDocs(q)

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }))
}

// ============================================================
// UNIABLe BACKEND NAVIGATION API
// ============================================================

const NAVIGATION_API = 'http://localhost:5000'

async function readApiResponse(response) {
  let data

  try {
    data = await response.json()
  } catch {
    throw new Error('The navigation server returned an invalid response.')
  }

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message || 'The navigation request failed.'
    )
  }

  return data
}

// ============================================================
// LOAD NAVIGATION LOCATIONS
// ============================================================

export const getNavigationLocations = async () => {
  const response = await fetch(
    `${NAVIGATION_API}/api/navigation/locations`
  )

  const data = await readApiResponse(response)

  if (!Array.isArray(data.locations)) {
    throw new Error('The server returned an invalid locations list.')
  }

  return data.locations.map(location => ({
    ...location,
    id: location.id,
    name: location.name,
    type: location.type,
    floor: location.floor,
    accessible: location.accessible !== false,
  }))
}

// ============================================================
// CALCULATE ACCESSIBLE ROUTE
// ============================================================

export const calculateNavigationRoute = async (
  start,
  destination
) => {
  if (!start || !destination) {
    throw new Error(
      'Please select a starting point and destination.'
    )
  }

  if (start === destination) {
    throw new Error(
      'Your starting point and destination cannot be the same.'
    )
  }

  const params = new URLSearchParams({
    start,
    destination,
  })

  const response = await fetch(
    `${NAVIGATION_API}/api/navigation/route?${params.toString()}`
  )

  const data = await readApiResponse(response)

  if (!Array.isArray(data.route) || data.route.length === 0) {
    throw new Error('No accessible route was found.')
  }

  if (!Array.isArray(data.connections)) {
    throw new Error('The server did not return route instructions.')
  }

  if (data.connections.length !== data.route.length - 1) {
    throw new Error('The route instructions are incomplete.')
  }

  const connections = data.connections.map(connection => ({
    ...connection,
    instruction:
      connection.instruction ||
      connection.forwardInstruction ||
      connection.reverseInstruction ||
      'Continue along the accessible route.',
    accessible: connection.accessible !== false,
  }))

  if (connections.some(connection => !connection.accessible)) {
    throw new Error('The route contains an inaccessible connection.')
  }

  return {
    ...data,
    route: data.route,
    connections,
    distanceMeters: data.distanceMeters,
    accessible: data.accessible !== false,
  }
}

