export const store = {
  requests: [
    { id:"1", student:"Naledi M.", type:"Campus navigation", detail:"Needs an accessible route to Room 204.", location:"Science Building", priority:"Normal", status:"open", time:"2 min ago" },
    { id:"2", student:"Thabo K.", type:"Lecture assistance", detail:"Needs help getting to Computer Lab 3.", location:"Library entrance", priority:"Normal", status:"open", time:"8 min ago" },
    { id:"3", student:"Anonymous student", type:"Emergency check-in", detail:"Student has not responded to a safety check-in.", location:"Student Centre", priority:"Urgent", status:"open", time:"1 min ago" }
  ],
  volunteers: [{id:"volunteer-001",name:"Relebohile",available:true}],
  accessibility: { "student-001": {highContrast:true,largeText:false,screenReader:true,voiceFirst:true,reduceMotion:false} },
  sos: []
};
