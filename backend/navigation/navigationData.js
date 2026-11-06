// ============================================================
// UNIABLe — CAMPUS NAVIGATION DATA
// Levels 1, 3 and 4
// ============================================================

const floors = {
  level1: { id: "level1", name: "Level 1", levelNumber: 1 },
  level3: { id: "level3", name: "Level 3", levelNumber: 3 },
  level4: { id: "level4", name: "Level 4", levelNumber: 4 },
};

const locations = {};

function addLocation(
  id,
  name,
  type,
  floorId,
  accessible = true,
  selectable = true
) {
  locations[id] = {
    id,
    name,
    type,
    floorId,
    accessible,
    selectable,
  };
}

// Each edge contains instructions for BOTH directions.
// Distances are provisional estimates, not measured distances.

const connections = [];

function addConnection(
  from,
  to,
  distance,
  forwardInstruction,
  reverseInstruction,
  accessible = true
) {
  connections.push({
    from,
    to,
    distance,
    forwardInstruction,
    reverseInstruction,
    accessible,
  });
}

// ============================================================
// LEVEL 1 — DESTINATIONS
// ============================================================

addLocation("entrance", "Main Entrance", "entrance", "level1");
addLocation("reception", "Reception", "service", "level1");
addLocation("meetingPods", "Meeting Pods", "meeting", "level1");

addLocation("lectureRoomL1A", "Venue 1", "classroom", "level1");
addLocation("lectureRoomL1C", "Venue 2", "classroom", "level1");

addLocation(
  "studentAdvisorOfficeL1",
  "Venue 3 — Student Advisor Office",
  "office",
  "level1"
);

addLocation("lectureRoomL1E", "Venue 4", "classroom", "level1");
addLocation("lectureRoomL1B", "Venue 5", "classroom", "level1");

addLocation("auditoriumL1", "Auditorium", "auditorium", "level1");
addLocation("libraryStudyL1", "Library / Study", "study", "level1");
addLocation("staffOfficeL1", "Staff Room", "office", "level1");
addLocation("sickBayL1", "Sick Bay", "medical", "level1");
addLocation("officeL1A", "Office", "office", "level1");
addLocation("officeL1B", "Office", "office", "level1");
addLocation("syndicateRoomL1A", "Syndicate Room", "meeting", "level1");
addLocation("syndicateRoomL1B", "Syndicate Room", "meeting", "level1");
addLocation("serverRoomL1", "Server Room", "technical", "level1");
addLocation("storeSafeL1", "Store & Safe", "storage", "level1");
addLocation("liftL1", "Lifts", "elevator", "level1");

// ============================================================
// LEVEL 1 — INTERNAL NODES
// ============================================================

[
  ["corridorL1Entry", "Entrance Corridor"],
  ["foyerL1", "Level 1 Foyer"],
  ["corridorL1Sensors", "Corridor Past the Sensors"],
  ["corridorL1Junction", "Main Junction"],

  // Additional junction for the Venue 4 route
  ["corridorL1Venue4Junction", "Venue 4 Junction"],

  ["corridorL1Venue1", "Venue 1 Approach"],
  ["corridorL1Second", "Second Corridor"],
  ["corridorL1Venue2", "Venue 2 Approach"],
  ["corridorL1Library", "Library Corridor"],
  ["corridorL1Venue4", "Venue 4 Approach"],
  ["corridorL1Venue5", "Venue 5 Corridor"],
  ["corridorL1Staff", "Staff Room Corridor"],
  ["corridorL1Advisor", "Student Advisor Corridor"],
  ["corridorL1Reception", "Reception Corridor"],
  ["corridorL1Lift", "Lift Corridor"],
  ["corridorL1Auditorium", "Auditorium Approach"],
  ["corridorL1MeetingPods", "Meeting Pods Passage"],
].forEach(([id, name]) =>
  addLocation(id, name, "corridor", "level1", true, false)
);

// ============================================================
// LEVEL 1 — MAIN ENTRANCE AND FOYER
// ============================================================

addConnection(
  "entrance",
  "corridorL1Entry",
  5,
  "Walk straight along the entrance corridor.",
  "Walk straight back towards the main entrance."
);

addConnection(
  "corridorL1Entry",
  "foyerL1",
  8,
  "Continue straight and pass through the glass doors into the Level 1 foyer.",
  "Walk straight through the glass doors towards the main entrance."
);

addConnection(
  "foyerL1",
  "corridorL1Sensors",
  6,
  "Turn right and continue past the sensors.",
  "Walk back towards the foyer and turn left."
);

addConnection(
  "corridorL1Sensors",
  "corridorL1Junction",
  5,
  "Continue past the sensors until you reach the junction.",
  "Walk back towards the sensors and continue to the foyer."
);

// ============================================================
// LEVEL 1 — ADDITIONAL VENUE 4 JUNCTION
// ============================================================

addConnection(
  "corridorL1Sensors",
  "corridorL1Venue4Junction",
  3,
  "After passing the sensors, turn left and walk a short distance to the junction.",
  "Walk back from the Venue 4 junction towards the sensors."
);

addConnection(
  "corridorL1Venue4Junction",
  "lectureRoomL1E",
  7,
  "Turn right, continue straight towards the door ahead, and enter Venue 4.",
  "Leave Venue 4 and walk back towards the junction."
);

// ============================================================
// LEVEL 1 — VENUE 1 AND THE SECOND CORRIDOR
// ============================================================

addConnection(
  "corridorL1Junction",
  "corridorL1Venue1",
  3,
  "Turn left towards the lecture room next to Reception.",
  "Walk back towards the junction."
);

addConnection(
  "corridorL1Venue1",
  "lectureRoomL1A",
  3,
  "Enter Venue 1.",
  "Leave Venue 1 through the other door."
);

addConnection(
  "lectureRoomL1A",
  "corridorL1Second",
  4,
  "Leave Venue 1 through its other door. You are now in the second corridor.",
  "Enter Venue 1 through the opposite door."
);

// Venue 2 is across the second corridor from Venue 1.
addConnection(
  "corridorL1Second",
  "lectureRoomL1C",
  4,
  "Cross the corridor to your right and enter Venue 2.",
  "Leave Venue 2 and cross the corridor towards Venue 1."
);

// ============================================================
// LEVEL 1 — VENUES 2, 3 AND 4
// ============================================================

addConnection(
  "corridorL1Second",
  "corridorL1Library",
  4,
  "Turn right and continue down the corridor.",
  "Walk back down the corridor towards the second corridor."
);

addConnection(
  "corridorL1Library",
  "corridorL1Venue4",
  5,
  "Continue past the Student Advisor Office and the Library towards Venue 4.",
  "Walk back past the Library towards the Student Advisor Office."
);

addConnection(
  "corridorL1Library",
  "studentAdvisorOfficeL1",
  3,
  "Turn right after the Library. The first room is the Student Advisor Office, Venue 3.",
  "Leave the Student Advisor Office and return to the corridor."
);

addConnection(
  "corridorL1Library",
  "libraryStudyL1",
  3,
  "Enter the Library / Study area.",
  "Leave the Library / Study area and return to the corridor."
);

addConnection(
  "corridorL1Venue4",
  "lectureRoomL1E",
  3,
  "Enter Venue 4 through the door ahead.",
  "Leave Venue 4 and return to the corridor."
);

// ============================================================
// LEVEL 1 — VENUE 5 AND STAFF ROOM
// ============================================================

addConnection(
  "corridorL1Venue4",
  "corridorL1Venue5",
  5,
  "Continue straight towards the Staff Room. Venue 5 is the door next to it.",
  "Walk back towards Venue 4."
);

addConnection(
  "corridorL1Venue5",
  "lectureRoomL1B",
  3,
  "Enter Venue 5.",
  "Leave Venue 5 and return to the corridor."
);

addConnection(
  "corridorL1Venue5",
  "staffOfficeL1",
  3,
  "Enter the Staff Room.",
  "Leave the Staff Room. Venue 5 is the first door on your left."
);

// ============================================================
// LEVEL 1 — STUDENT ADVISOR ROUTE FROM THE STAFF ROOM SIDE
// ============================================================

addConnection(
  "corridorL1Junction",
  "corridorL1Staff",
  6,
  "Turn left and continue in the direction of the Staff Room.",
  "Walk back towards the main junction."
);

addConnection(
  "corridorL1Staff",
  "staffOfficeL1",
  3,
  "Enter the Staff Room.",
  "Leave the Staff Room and return to the corridor."
);

addConnection(
  "corridorL1Staff",
  "corridorL1Venue5",
  4,
  "Turn right and continue down the corridor past Venue 5 and Venue 4.",
  "Walk back towards the Staff Room."
);

addConnection(
  "corridorL1Venue5",
  "corridorL1Advisor",
  5,
  "Turn right and continue down the corridor past the Library.",
  "Walk back past the Library towards Venue 4 and Venue 5."
);

addConnection(
  "corridorL1Advisor",
  "studentAdvisorOfficeL1",
  3,
  "The first room after the Library is the Student Advisor Office, Venue 3. Enter it.",
  "Leave the Student Advisor Office and return to the corridor."
);

// ============================================================
// LEVEL 1 — AUDITORIUM
// ============================================================

addConnection(
  "corridorL1Junction",
  "corridorL1Auditorium",
  4,
  "From the junction, go to your right and approach the door.",
  "Leave the Auditorium and return to the junction."
);

addConnection(
  "corridorL1Auditorium",
  "auditoriumL1",
  3,
  "Enter the Auditorium through the door ahead.",
  "Leave the Auditorium and return to the corridor."
);

addConnection(
  "corridorL1Staff",
  "corridorL1Auditorium",
  5,
  "Walk out of the Staff Room area and enter the Auditorium through the door facing you.",
  "Leave the Auditorium and return towards the Staff Room."
);

// ============================================================
// LEVEL 1 — RECEPTION AND MEETING PODS
// ============================================================

addConnection(
  "foyerL1",
  "corridorL1Reception",
  5,
  "Walk towards Reception.",
  "Walk back towards the foyer."
);

addConnection(
  "corridorL1Reception",
  "reception",
  3,
  "Enter Reception.",
  "Leave Reception and turn right towards Venue 1."
);

addConnection(
  "reception",
  "lectureRoomL1A",
  4,
  "Leave Reception, turn right and enter the first room, Venue 1.",
  "Leave Venue 1 and return towards Reception."
);

addConnection(
  "corridorL1Reception",
  "corridorL1MeetingPods",
  4,
  "Continue down the passage towards the Meeting Pods.",
  "Walk back towards Reception."
);

addConnection(
  "corridorL1MeetingPods",
  "meetingPods",
  3,
  "Enter the Meeting Pods area.",
  "Leave the Meeting Pods area and return to the passage."
);

// ============================================================
// LEVEL 1 — OTHER CONFIRMED ROOMS AND LIFTS
// ============================================================

addConnection(
  "corridorL1Junction",
  "corridorL1Lift",
  5,
  "Continue towards the lift corridor.",
  "Walk back towards the main junction."
);

addConnection(
  "corridorL1Lift",
  "liftL1",
  3,
  "Continue to the lifts.",
  "Leave the lifts and return to the corridor."
);

addConnection(
  "corridorL1Reception",
  "sickBayL1",
  5,
  "Enter the Sick Bay.",
  "Leave the Sick Bay and return to the corridor."
);

addConnection(
  "corridorL1Reception",
  "officeL1A",
  4,
  "Enter the office.",
  "Leave the office and return to the corridor."
);

addConnection(
  "corridorL1Reception",
  "officeL1B",
  5,
  "Enter the office.",
  "Leave the office and return to the corridor."
);

addConnection(
  "corridorL1Staff",
  "syndicateRoomL1A",
  4,
  "Enter the Syndicate Room.",
  "Leave the Syndicate Room and return to the corridor."
);

addConnection(
  "corridorL1Staff",
  "syndicateRoomL1B",
  6,
  "Enter the Syndicate Room.",
  "Leave the Syndicate Room and return to the corridor."
);

addConnection(
  "corridorL1Reception",
  "serverRoomL1",
  6,
  "Enter the Server Room.",
  "Leave the Server Room and return to the corridor."
);

addConnection(
  "corridorL1Reception",
  "storeSafeL1",
  7,
  "Enter the Store and Safe area.",
  "Leave the Store and Safe area and return to the corridor."
);

// ============================================================
// LEVEL 3 — DESTINATIONS
// ============================================================

addLocation("liftL3", "Lifts", "elevator", "level3");
addLocation("lectureRoomL3A", "Venue 6", "classroom", "level3");
addLocation("lectureRoomL3B", "Venue 7", "classroom", "level3");
addLocation("lectureRoomL3C", "Venue 8", "classroom", "level3");
addLocation("lectureRoomL3D", "Venue 9", "classroom", "level3");
addLocation("lectureRoomL3E", "Venue 10", "classroom", "level3");
addLocation("lectureRoomL3F", "Venue 11", "classroom", "level3");
addLocation("pcLabL3", "PC Lab 1", "lab", "level3");
addLocation("pcLabL3B", "PC Lab 2", "lab", "level3");

addLocation(
  "escapeStairL3",
  "Escape Stair — Inaccessible",
  "stairs",
  "level3",
  false,
  false
);

// Level 3 internal nodes
[
  ["foyerL3", "Foyer"],
  ["corridorL3First", "First Section Corridor"],
  ["corridorL3FirstSensors", "First Section Sensors"],
  ["corridorL3Courtyard", "Courtyard"],
  ["corridorL3GlassDoors", "Second Section Glass Doors"],
  ["corridorL3SecondSensors", "Second Section Sensors"],
  ["corridorL3Second", "Second Section Corridor"],
  ["corridorL3End", "End of Second Section Corridor"],
  ["corridorL3Venue8", "Venue 8 and PC Lab 2 Corridor"],
].forEach(([id, name]) =>
  addLocation(id, name, "corridor", "level3", true, false)
);

// ============================================================
// LEVEL 3 — FIRST SECTION
// ============================================================

addConnection(
  "liftL3",
  "foyerL3",
  4,
  "Exit the lifts and walk straight into the foyer.",
  "Walk back to the lifts."
);

addConnection(
  "foyerL3",
  "corridorL3First",
  4,
  "Turn left and enter the first section corridor.",
  "Walk back towards the foyer."
);

addConnection(
  "corridorL3First",
  "corridorL3FirstSensors",
  5,
  "Continue along the corridor and pass the sensors.",
  "Walk back through the first section towards the foyer."
);

addConnection(
  "corridorL3FirstSensors",
  "lectureRoomL3A",
  3,
  "Enter Venue 6.",
  "Leave Venue 6 and return towards the sensors."
);

addConnection(
  "corridorL3FirstSensors",
  "lectureRoomL3B",
  4,
  "Enter Venue 7.",
  "Leave Venue 7 and return towards the sensors."
);

addConnection(
  "corridorL3FirstSensors",
  "pcLabL3",
  4,
  "Enter PC Lab 1.",
  "Leave PC Lab 1 and return towards the sensors."
);

// ============================================================
// LEVEL 3 — ROUTE FROM VENUE 6 TO VENUE 11
// ============================================================

addConnection(
  "corridorL3FirstSensors",
  "corridorL3Courtyard",
  8,
  "Continue past the sensors into the foyer.",
  "Walk back towards the first section sensors."
);

addConnection(
  "corridorL3Courtyard",
  "corridorL3GlassDoors",
  7,
  "Turn left and walk past the Courtyard. Enter the glass doors on your left.",
  "Leave through the glass doors and walk back past the Courtyard."
);

addConnection(
  "corridorL3GlassDoors",
  "corridorL3SecondSensors",
  4,
  "Pass through the second set of sensors.",
  "Walk back through the sensors towards the glass doors."
);

addConnection(
  "corridorL3SecondSensors",
  "corridorL3Second",
  5,
  "Once through the sensors, turn right and continue down the corridor.",
  "Walk back towards the sensors."
);

addConnection(
  "corridorL3Second",
  "corridorL3End",
  6,
  "Continue down the corridor to the end.",
  "Walk back along the corridor."
);

addConnection(
  "corridorL3End",
  "lectureRoomL3F",
  3,
  "Turn left at the end of the corridor. Enter Venue 11.",
  "Leave Venue 11 and return to the end of the corridor."
);

// ============================================================
// LEVEL 3 — VENUES 8, 9 AND 10; PC LAB 2
// ============================================================

addConnection(
  "corridorL3Second",
  "corridorL3Venue8",
  4,
  "Continue towards PC Lab 2 and Venue 8.",
  "Walk back towards the second section corridor."
);

addConnection(
  "corridorL3Venue8",
  "pcLabL3B",
  3,
  "Enter PC Lab 2.",
  "Leave PC Lab 2 and return to the corridor."
);

addConnection(
  "corridorL3Venue8",
  "lectureRoomL3C",
  3,
  "Enter Venue 8, next to PC Lab 2.",
  "Leave Venue 8 and return to the corridor."
);

addConnection(
  "corridorL3Venue8",
  "lectureRoomL3D",
  4,
  "Cross the corridor and enter Venue 9, opposite Venue 8.",
  "Leave Venue 9 and cross back towards Venue 8."
);

addConnection(
  "lectureRoomL3F",
  "lectureRoomL3E",
  4,
  "Leave Venue 11. Venue 10 is directly across from it.",
  "Leave Venue 10 and cross back to Venue 11."
);

// Inaccessible escape stair is deliberately not connected
// to an accessible route.

// ============================================================
// LEVEL 4 — DESTINATIONS
// ============================================================

addLocation("liftL4", "Lifts", "elevator", "level4");
addLocation("pcLabL4", "PC Lab 3", "lab", "level4");

addLocation(
  "women'sRestroomL4",
  "Women's Restroom",
  "restroom",
  "level4"
);

addLocation(
  "mensRestroomL4",
  "Men's Restroom",
  "restroom",
  "level4"
);

addLocation("lectureRoomL4A", "Venue 12", "classroom", "level4");
addLocation("lectureRoomL4B", "Venue 13", "classroom", "level4");
addLocation("lectureRoomL4C", "Venue 14", "classroom", "level4");

addLocation("receptionL4", "Reception", "service", "level4");
addLocation("storeL4", "Store Room", "storage", "level4");

addLocation(
  "escapeStairL4",
  "Escape Stair — Inaccessible",
  "stairs",
  "level4",
  false,
  false
);

// Level 4 internal nodes
[
  ["foyerL4", "Level 4 Foyer"],
  ["corridorL4PCLab", "PC Lab 3 Corridor"],
  ["corridorL4Restrooms", "Restroom Corridor"],
  ["corridorL4GlassDoors", "Glass Door Corridor"],
  ["corridorL4Sensors", "Corridor Past the Sensors"],
  ["corridorL4VenueHall", "Second Section Venue Hall"],
].forEach(([id, name]) =>
  addLocation(id, name, "corridor", "level4", true, false)
);

// ============================================================
// LEVEL 4 — LIFTS, FOYER AND PC LAB 3
// ============================================================

addConnection(
  "liftL4",
  "foyerL4",
  4,
  "Exit the lifts and enter the Level 4 foyer.",
  "Walk back towards the lifts."
);

addConnection(
  "foyerL4",
  "corridorL4PCLab",
  5,
  "Turn left, pass through the glass doors and continue through the sensors.",
  "Walk back through the sensors and glass doors towards the foyer."
);

addConnection(
  "corridorL4PCLab",
  "pcLabL4",
  3,
  "Turn left and enter PC Lab 3.",
  "Leave PC Lab 3 and return through the corridor to the foyer."
);

// ============================================================
// LEVEL 4 — SECOND SECTION AND RESTROOMS
// ============================================================

addConnection(
  "foyerL4",
  "corridorL4Restrooms",
  6,
  "From the foyer, turn left and walk past the restrooms.",
  "Walk back towards the foyer."
);

addConnection(
  "corridorL4Restrooms",
  "women'sRestroomL4",
  3,
  "Enter the Women's Restroom.",
  "Leave the Women's Restroom and return to the corridor."
);

addConnection(
  "corridorL4Restrooms",
  "mensRestroomL4",
  3,
  "Enter the Men's Restroom.",
  "Leave the Men's Restroom and return to the corridor."
);

addConnection(
  "corridorL4Restrooms",
  "corridorL4GlassDoors",
  5,
  "Continue past the restrooms and through the glass doors.",
  "Walk back through the glass doors towards the restrooms."
);

addConnection(
  "corridorL4GlassDoors",
  "corridorL4Sensors",
  4,
  "Continue forward and pass through the sensors.",
  "Walk back through the sensors towards the glass doors."
);

addConnection(
  "corridorL4Sensors",
  "corridorL4VenueHall",
  4,
  "Continue into the second section venue hall.",
  "Walk back towards the sensors."
);

// ============================================================
// LEVEL 4 — VENUES 12, 13 AND 14
// ============================================================

addConnection(
  "corridorL4VenueHall",
  "lectureRoomL4A",
  3,
  "The first venue on your right is Venue 12. Enter it.",
  "Leave Venue 12 and return to the venue hall."
);

addConnection(
  "corridorL4VenueHall",
  "lectureRoomL4B",
  4,
  "Continue straight ahead and enter Venue 13.",
  "Leave Venue 13 and return to the venue hall."
);

addConnection(
  "corridorL4VenueHall",
  "lectureRoomL4C",
  4,
  "Turn left and enter Venue 14.",
  "Leave Venue 14 and return to the venue hall."
);

addConnection(
  "corridorL4VenueHall",
  "receptionL4",
  4,
  "Continue towards Reception.",
  "Walk back towards the venue hall."
);

addConnection(
  "corridorL4VenueHall",
  "storeL4",
  4,
  "Enter the Store Room.",
  "Leave the Store Room and return to the venue hall."
);

// ============================================================
// CROSS-FLOOR LIFT CONNECTIONS
// ============================================================

addConnection(
  "liftL1",
  "liftL3",
  0,
  "Take the lift to Level 3.",
  "Take the lift to Level 1."
);

addConnection(
  "liftL3",
  "liftL4",
  0,
  "Take the lift to Level 4.",
  "Take the lift to Level 3."
);

// ============================================================
// HELPERS
// ============================================================

function getLocation(id) {
  return locations[id] || null;
}

function getConnections(locationId) {
  return connections.filter(
    edge => edge.from === locationId || edge.to === locationId
  );
}

function getFloor(floorId) {
  return floors[floorId] || null;
}

function getLocationsByFloor(floorId) {
  return Object.values(locations).filter(
    location => location.floorId === floorId
  );
}

function getSelectableLocations() {
  return Object.values(locations).filter(
    location => location.selectable && location.accessible
  );
}

module.exports = {
  floors,
  locations,
  connections,
  getLocation,
  getConnections,
  getFloor,
  getLocationsByFloor,
  getSelectableLocations,
};

