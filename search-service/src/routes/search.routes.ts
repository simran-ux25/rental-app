//src/routes/search.routes.ts 
import { Router } from "express";

import {
  searchVehicles,
  getVehicleLocations,
  searchPickupLocations,
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


/**
 * =========================================================
 * Autocomplete pickup locations
 *
 * Example:
 * GET /search/locations?city=Pune&query=vi
 * =========================================================
 */
router.get("/locations", searchPickupLocations);


/**
 * =========================================================
 * Get vehicles available at a pickup location
 *
 * Sorting supported:
 * sort=relevance (default)
 * sort=price_low
 * sort=price_high
 *
 * Examples:
 * GET /search/location/vehicles?city=Pune&pickup_location=Viman Nagar
 * GET /search/location/vehicles?city=Pune&pickup_location=Viman Nagar&sort=price_low
 * GET /search/location/vehicles?city=Pune&pickup_location=Viman Nagar&sort=price_high
 * =========================================================
 */
router.get("/location/vehicles", searchVehiclesByPickupLocation);


export default router;