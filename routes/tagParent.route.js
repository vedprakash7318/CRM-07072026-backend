import express from "express";
import {
  createTagParent,
  getAllTagParents,
  getSingleTagParent,
  updateTagParent,
  deleteTagParent
} from "../controllers/tagParent.controller.js";

const router = express.Router();

router.post("/create", createTagParent);
router.get("/all", getAllTagParents);
router.get("/:id", getSingleTagParent);
router.put("/update/:id", updateTagParent);
router.delete("/delete/:id", deleteTagParent);

export default router;