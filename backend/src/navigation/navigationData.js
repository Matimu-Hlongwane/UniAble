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
// LEVEL 1 — INTERNAL CORRIDORS AND JUNCTIONS
// ============================================================

[
  ["corridorL1Entry", "Entrance Corridor"],
  ["foyerL1", "Level 1 Foyer"],
  ["corridorL1Sensors", "Corridor Past the Sensors"],
  ["corridorL1Junction", "Venue 1 and Auditorium Corridor"],
  ["corridorL1Venue1", "Venue 1 Approach"],
  ["corridorL1Second", "Second Corridor"],
  ["corridorL1Venue2", "Venue 2 Approach"],
  ["corridorL1Library", "Library Corridor"],
  ["corridorL1Venue4", "Venue 4 Approach"],
  ["corridorL1Venue4Junction", "Venue 4 Junction"],
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
  "Continue straight through the glass doors into the Level 1 foyer.",
  "Walk back through the glass doors towards the main entrance."
);

addConnection(
  "foyerL1",
  "corridorL1Sensors",
  6,
  "Turn right and walk past the sensors.",
  "Walk back towards the foyer and turn left."
);

// ============================================================
// LEVEL 1 — RIGHT BRANCH: VENUE 1 AND AUDITORIUM
// ============================================================

addConnection(
  "corridorL1Sensors",
  "corridorL1Junction",
  5,
  "After passing the sensors, turn right and continue along the corridor towards Venue 1 and the Auditorium.",
  "Walk back along the corridor towards the sensors."
);

addConnection(
  "corridorL1Junction",
  "corridorL1Venue1",
  3,
  "Continue along the corridor towards Venue 1, next to Reception.",
  "Walk back towards the corridor junction."
);

// Venue 1 is a destination branch, not a corridor.
addConnection(
  "corridorL1Venue1",
  "lectureRoomL1A",
  3,
  "Venue 1 is next to Reception. Enter the room on your left.",
  "Leave Venue 1 and return to the corridor."
);

// Auditorium is the door next to Venue 1.
addConnection(
  "corridorL1Venue1",
  "auditoriumL1",
  3,
  "The Auditorium is through the door next to Venue 1. Enter the Auditorium.",
  "Leave the Auditorium and return to the corridor."
);

// ============================================================
// LEVEL 1 — RECEPTION AND MEETING PODS
// ============================================================

addConnection(
  "corridorL1Venue1",
  "corridorL1Reception",
  4,
  "Walk past Venue 1 and continue towards Reception.",
  "Leave the Reception area and walk back towards Venue 1."
);

addConnection(
  "corridorL1Reception",
  "reception",
  3,
  "Enter Reception.",
  "Leave Reception and return to the corridor."
);

addConnection(
  "corridorL1Reception",
  "corridorL1MeetingPods",
  4,
  "Enter the Reception area and turn left. Continue towards the Meeting Pods behind Reception.",
  "Walk back from the Meeting Pods towards Reception."
);

addConnection(
  "corridorL1MeetingPods",
  "meetingPods",
  3,
  "Enter the Meeting Pods area behind Reception.",
  "Leave the Meeting Pods and return to the passage."
);

// ============================================================
// LEVEL 1 — LEFT BRANCH: STAFF ROOM AND VENUE 5
// ============================================================

addConnection(
  "corridorL1Sensors",
  "corridorL1Staff",
  5,
  "After passing the sensors, turn left and continue towards the Staff Room.",
  "Walk back along the corridor towards the sensors."
);

addConnection(
  "corridorL1Staff",
  "staffOfficeL1",
  3,
  "The Staff Room is straight ahead. Enter the room.",
  "Leave the Staff Room and return to the corridor."
);

addConnection(
  "corridorL1Staff",
  "corridorL1Venue5",
  4,
  "Walk past the Staff Room without entering it. Continue towards Venue 5.",
  "Walk back towards the Staff Room."
);

addConnection(
  "corridorL1Venue5",
  "lectureRoomL1B",
  3,
  "The venue next to the Staff Room is Venue 5. Enter Venue 5.",
  "Leave Venue 5 and return to the corridor."
);

// ============================================================
// LEVEL 1 — VENUE 4
// ============================================================

addConnection(
  "corridorL1Venue5",
  "corridorL1Venue4Junction",
  5,
  "Continue along the corridor past Venue 5. At the next junction, turn right towards Venue 4.",
  "Walk back towards Venue 5."
);

addConnection(
  "corridorL1Venue4Junction",
  "corridorL1Venue4",
  3,
  "Continue straight towards the door ahead. This is Venue 4.",
  "Leave Venue 4 and return to the junction."
);

addConnection(
  "corridorL1Venue4",
  "lectureRoomL1E",
  3,
  "Enter Venue 4.",
  "Leave Venue 4 and return to the corridor."
);

// ============================================================
// LEVEL 1 — LIBRARY
// ============================================================

addConnection(
  "corridorL1Venue4Junction",
  "corridorL1Library",
  5,
  "Continue along the corridor without entering Venue 4. Turn right towards the Library.",
  "Walk back towards the Venue 4 junction."
);

addConnection(
  "corridorL1Library",
  "libraryStudyL1",
  3,
  "The first venue on your left is the Library. Enter the Library.",
  "Leave the Library and return to the corridor."
);

// ============================================================
// LEVEL 1 — VENUE 3: STUDENT ADVISOR OFFICE
// ============================================================

addConnection(
  "corridorL1Library",
  "corridorL1Second",
  4,
  "Walk past the Library without entering it. Continue towards the Student Advisor Office and Venue 2.",
  "Walk back towards the Library."
);

addConnection(
  "corridorL1Second",
  "corridorL1Advisor",
  3,
  "Venue 3 is the Student Advisor Office. Turn towards the room and enter it.",
  "Leave Venue 3 and return to the corridor."
);

addConnection(
  "corridorL1Advisor",
  "studentAdvisorOfficeL1",
  2,
  "Enter Venue 3 — the Student Advisor Office.",
  "Leave the Student Advisor Office and return to the corridor."
);

// ============================================================
// LEVEL 1 — VENUE 2
// ============================================================

addConnection(
  "corridorL1Second",
  "corridorL1Venue2",
  4,
  "Continue past Venue 3 without entering it. The next door on your left is Venue 2.",
  "Walk back towards Venue 3."
);

addConnection(
  "corridorL1Venue2",
  "lectureRoomL1C",
  3,
  "Enter Venue 2.",
  "Leave Venue 2 and return to the corridor."
);

// ============================================================
// LEVEL 1 — VENUE 1 TO VENUES 2 AND 3
// ============================================================

addConnection(
  "corridorL1Venue1",
  "corridorL1Second",
  5,
  "From the corridor outside Venue 1, cross to your right towards the corridor beside Venue 3.",
  "Cross back towards Venue 1."
);

// ============================================================
// LEVEL 1 — LIFTS AND OTHER CONFIRMED ROOMS
// ============================================================

addConnection(
  "corridorL1Sensors",
  "corridorL1Lift",
  5,
  "Continue towards the lift corridor.",
  "Walk back towards the sensors."
);

addConnection(
  "corridorL1Lift",
  "liftL1",
  3,
  "Continue to the lifts.",
  "Leave the lifts and return to the corridor."
);

addConnection(
  "corridorL1Lift",
  "sickBayL1",
  5,
  "Continue towards the Sick Bay and enter it.",
  "Leave the Sick Bay and return to the corridor."
);

addConnection(
  "corridorL1Lift",
  "serverRoomL1",
  6,
  "Continue towards the Server Room and enter it.",
  "Leave the Server Room and return to the corridor."
);

addConnection(
  "corridorL1Lift",
  "storeSafeL1",
  7,
  "Continue towards the Store and Safe area and enter it.",
  "Leave the Store and Safe area and return to the corridor."
);

addConnection(
  "corridorL1Reception",
  "officeL1A",
  4,
  "Continue towards the office and enter it.",
  "Leave the office and return to the corridor."
);

addConnection(
  "corridorL1Reception",
  "officeL1B",
  5,
  "Continue towards the office and enter it.",
  "Leave the office and return to the corridor."
);

addConnection(
  "corridorL1Staff",
  "syndicateRoomL1A",
  4,
  "Continue towards the Syndicate Room and enter it.",
  "Leave the Syndicate Room and return to the corridor."
);

addConnection(
  "corridorL1Staff",
  "syndicateRoomL1B",
  6,
  "Continue towards the second Syndicate Room and enter it.",
  "Leave the Syndicate Room and return to the corridor."
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
  ["corridorL3Venue8", "Venue 8 and Venue 9 Corridor"],
  ["corridorL3Lab2Approach", "PC Lab 2 Approach"],
  ["corridorL3Venue10Turn", "Venue 10 Corridor Turn"],
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
// LEVEL 3 — FOYER, COURTYARD AND SECTION 2
// ============================================================

// Bypass Section 1 when travelling to Section 2.
addConnection(
  "foyerL3",
  "corridorL3Courtyard",
  6,
  "Walk straight through the Level 3 foyer, past the Courtyard.",
  "Walk back past the Courtyard towards the Level 3 foyer."
);

// Enter Section 2 through the glass doors on the left.
addConnection(
  "corridorL3Courtyard",
  "corridorL3GlassDoors",
  4,
  "After passing the Courtyard, turn left and enter Section 2 through the glass doors.",
  "Leave Section 2 through the glass doors and walk back towards the Courtyard."
);

// Pass the sensors.
addConnection(
  "corridorL3GlassDoors",
  "corridorL3SecondSensors",
  4,
  "Walk straight through Section 2 and pass the sensors.",
  "Walk back through the sensors towards the glass doors."
);

// ============================================================
// LEVEL 3 — PC LAB 2
// ============================================================

// Continue straight towards PC Lab 2.
addConnection(
  "corridorL3SecondSensors",
  "corridorL3Lab2Approach",
  3,
  "After passing the sensors, continue straight ahead towards PC Lab 2.",
  "Walk back from the PC Lab 2 approach towards the sensors."
);

addConnection(
  "corridorL3Lab2Approach",
  "pcLabL3B",
  2,
  "PC Lab 2 is straight ahead. Enter the lab.",
  "Leave PC Lab 2 and return to the corridor."
);

// ============================================================
// LEVEL 3 — VENUE 10
// ============================================================

// Continue past the PC Lab 2 entrance and turn right.
addConnection(
  "corridorL3Lab2Approach",
  "corridorL3Second",
  5,
  "Walk past the PC Lab 2 entrance. Turn right and continue down the corridor.",
  "Walk back along the corridor towards PC Lab 2."
);

// Continue down the corridor and turn right.
addConnection(
  "corridorL3Second",
  "corridorL3Venue10Turn",
  6,
  "Continue down the corridor. At the end, turn right towards Venue 10.",
  "Walk back along the corridor towards the PC Lab 2 area."
);

// Enter Venue 10.
addConnection(
  "corridorL3Venue10Turn",
  "lectureRoomL3E",
  3,
  "Enter Venue 10.",
  "Leave Venue 10 and return to the corridor."
);

// ============================================================
// LEVEL 3 — VENUES 8, 9 AND 11
// ============================================================

addConnection(
  "corridorL3Second",
  "corridorL3Venue8",
  4,
  "Continue towards Venue 8 and Venue 9.",
  "Walk back towards the second section corridor."
);

addConnection(
  "corridorL3Venue8",
  "lectureRoomL3C",
  3,
  "Enter Venue 8.",
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
  "corridorL3Second",
  "corridorL3End",
  6,
  "Continue down the corridor towards Venue 11.",
  "Walk back along the corridor."
);

addConnection(
  "corridorL3End",
  "lectureRoomL3F",
  3,
  "Turn left at the end of the corridor. Enter Venue 11.",
  "Leave Venue 11 and return to the end of the corridor."
);

// Venue 10 is directly across from Venue 11.
addConnection(
  "lectureRoomL3F",
  "lectureRoomL3E",
  4,
  "Leave Venue 11. Venue 10 is directly across from it.",
  "Leave Venue 10 and cross back to Venue 11."
);




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

export {
  floors,
  locations,
  connections,
  getLocation,
  getConnections,
  getFloor,
  getLocationsByFloor,
  getSelectableLocations,
};
