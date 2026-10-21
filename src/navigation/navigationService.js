import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'

/*
  Get all campuses belonging to a university
*/
export const getCampuses = async (universityId) => {
  try {
    const campusesRef = collection(db, 'campuses')

    const campusQuery = query(
      campusesRef,
      where('universityId', '==', universityId)
    )

    const snapshot = await getDocs(campusQuery)

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error('Error loading campuses:', error)
    throw error
  }
}

/*
  Get all buildings belonging to a campus
*/
export const getBuildings = async (campusId) => {
  try {
    const buildingsRef = collection(db, 'buildings')

    const buildingQuery = query(
      buildingsRef,
      where('campusId', '==', campusId)
    )

    const snapshot = await getDocs(buildingQuery)

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error('Error loading buildings:', error)
    throw error
  }
}

/*
  Get all floors belonging to a building
*/
export const getFloors = async (buildingId) => {
  try {
    const floorsRef = collection(db, 'floors')

    const floorQuery = query(
      floorsRef,
      where('buildingId', '==', buildingId)
    )

    const snapshot = await getDocs(floorQuery)

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error('Error loading floors:', error)
    throw error
  }
}

/*
  Get all locations belonging to a floor
*/
export const getLocations = async (floorId) => {
  try {
    const locationsRef = collection(db, 'locations')

    const locationQuery = query(
      locationsRef,
      where('floorId', '==', floorId)
    )

    const snapshot = await getDocs(locationQuery)

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error('Error loading locations:', error)
    throw error
  }
}

/*
  Get navigation connections.
  These describe how locations are connected.
*/
export const getConnections = async (floorId) => {
  try {
    const connectionsRef = collection(db, 'connections')

    const connectionQuery = query(
      connectionsRef,
      where('floorId', '==', floorId)
    )

    const snapshot = await getDocs(connectionQuery)

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error('Error loading connections:', error)
    throw error
  }
}