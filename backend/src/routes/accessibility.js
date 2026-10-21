import { Router } from "express";
import { store } from "../services/store.js";
const router=Router();

router.get("/:studentId",(req,res)=>res.json({profile:store.accessibility[req.params.studentId] || {}}));
router.put("/:studentId",(req,res)=>{
  store.accessibility[req.params.studentId]={...store.accessibility[req.params.studentId],...req.body};
  res.json({profile:store.accessibility[req.params.studentId]});
});
export default router;
