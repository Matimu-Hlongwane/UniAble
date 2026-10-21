import { Router } from "express";
import { store } from "../services/store.js";
const router = Router();

router.get("/requests",(req,res)=>res.json({requests:store.requests}));
router.post("/requests",(req,res)=>{
  const {studentId="student-001",type="General assistance",detail="",location="Unknown",priority="Normal"}=req.body;
  const item={id:crypto.randomUUID(),student:studentId,type,detail,location,priority,status:"open",time:"just now"};
  store.requests.unshift(item); res.status(201).json({request:item});
});
router.patch("/requests/:id",(req,res)=>{
  const item=store.requests.find(x=>x.id===req.params.id);
  if(!item)return res.status(404).json({message:"Request not found"});
  if(!["open","accepted","declined","completed"].includes(req.body.status))return res.status(400).json({message:"Invalid status"});
  item.status=req.body.status; res.json({request:item});
});
router.get("/volunteers",(req,res)=>res.json({volunteers:store.volunteers}));
router.patch("/volunteers/:id/availability",(req,res)=>{
  const v=store.volunteers.find(x=>x.id===req.params.id);
  if(!v)return res.status(404).json({message:"Volunteer not found"});
  v.available=Boolean(req.body.available); res.json({volunteer:v});
});
export default router;
