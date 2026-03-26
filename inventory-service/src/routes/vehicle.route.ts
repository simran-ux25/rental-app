import { Router } from "express";
import { addVehicle, deleteVehicle, updateVehicle, getVehicleById} from "../controller/vehicle.controller";
import { requireAuth, requireOwner } from "../middleware/auth.middleware";

const router = Router();

router.post("/addvehicle", requireAuth, requireOwner, addVehicle);

router.delete("/:vehicleId", requireAuth, requireOwner, deleteVehicle);

router.patch("/:vehicleId", requireAuth, requireOwner, updateVehicle);

router.get("/:vehicleId",requireAuth,getVehicleById)


export default router;