//src/routes/search.routes.ts 
import { Router } from "express";

import {
  searchVehicles,
  getVehicleLocations,
} from "../controller/search.controller.js";

const router = Router();

/**
 * =========================================================
 * Search vehicle models by name (autocomplete)
 *
 * Sorting supported:
 * sort=relevance (default)
 * sort=price_low
 * sort=price_high
 *
 * Examples:
 * GET /search/vehicles?city=Pune&name=ya
 * GET /search/vehicles?city=Pune&name=ya&sort=price_low
 * GET /search/vehicles?city=Pune&name=ya&sort=price_high
 * =========================================================
 */
router.get("/vehicles", searchVehicles);


/**
 * =========================================================
 * Get pickup locations where a vehicle model is available
 *
 * Example:
 * GET /search/vehicles/locations?city=Pune&vehicle_name=Activa 125
 * =========================================================
 */
router.get("/vehicles/locations", getVehicleLocations);


