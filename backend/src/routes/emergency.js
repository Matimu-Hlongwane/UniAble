import { Router } from "express";
import { store } from "../services/store.js";
const router=Router();

router.post("/sos",(req,res)=>{
  const alert={id:crypto.randomUUID(),...req.body,status:"active",createdAt:new Date().toISOString()};
  store.sos.push(alert);
  // Production: publish FCM notification to security + eligible nearby volunteers.
  console.log("DEMO SOS:", alert);
  res.status(201).json({message:"SOS created",alert,notified:["security","nearby-volunteers"]});
});
router.get("/sos",(req,res)=>res.json({alerts:store.sos}));
export default router;
