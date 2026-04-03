//src/controller/search.controller.ts
import { Request, Response } from "express";
import { pool } from "../config/db.js";


/**
 * =========================================================
 * 1. Search vehicle models by name
 *
 * Example:
 * GET /search/vehicles?city=Pune&name=act
 *
 * Returns vehicle models matching prefix
 * =========================================================
 */
export const searchVehicles = async (req: Request, res: Response) => {

  try {

    const city = req.query.city as string;
    const name = (req.query.name as string || "").trim();
    const sort = (req.query.sort as string || "relevance").trim();

    if (!city || !name) {
      return res.status(400).json({
        success: false,
        message: "city and name are required"
      });
    }

    let orderBy = "available_units DESC"; // relevance

    if (sort === "price_low") {
      orderBy = "price_per_hour ASC";
    }
    else if (sort === "price_high") {
      orderBy = "price_per_hour DESC";
    }

    const sql = `
      SELECT
        v.name AS vehicle_name,
        COUNT(*) AS available_units,
        MIN(v.price_per_hour) AS price_per_hour
      FROM vehicles v
      JOIN cities c ON c.id = v.city_id
      WHERE
        c.name = ?
        AND v.owner_status = 'ACTIVE'
        AND v.booking_status = 'AVAILABLE'
        AND v.name LIKE ?
      GROUP BY v.name
      ORDER BY ${orderBy}
      LIMIT 20
    `;

    const [rows] = await pool.execute(sql, [city, `${name}%`]);

    return res.status(200).json({
      success: true,
      data: rows
    });

  }
  catch (error) {

    console.error("searchVehicles error:", error);

    return res.status(500).json({
      success: false,
      message: "internal server error"
    });

  }
};



/**
 * =========================================================
 * 2. Get pickup locations for a specific vehicle model
 *
 * Example:
 * GET /search/vehicles/locations?city=Pune&vehicle_name=Activa 125
 *
 * Returns all pickup locations where this vehicle exists
 * =========================================================
 */
export const getVehicleLocations = async (req: Request, res: Response) => {

  try {

    const city = req.query.city as string;
    const vehicleName = (req.query.vehicle_name as string || "").trim();

    if (!city || !vehicleName) {
      return res.status(400).json({
        success: false,
        message: "city and vehicle_name are required"
      });
    }

    const sql = `
      SELECT
        v.pickup_location,
        COUNT(*) AS available_units
      FROM vehicles v
      JOIN cities c ON c.id = v.city_id
      WHERE
        c.name = ?
        AND v.name = ?
        AND v.status = 'ACTIVE'
      GROUP BY v.pickup_location
      ORDER BY v.pickup_location ASC
    `;

    const [rows] = await pool.execute(sql, [city, vehicleName]);

    return res.status(200).json({
      success: true,
      data: rows
    });

  }
  catch (error) {

    console.error("getVehicleLocations error:", error);

    return res.status(500).json({
      success: false,
      message: "internal server error"
    });

  }
};



/**
 * =========================================================
 * 3. Autocomplete pickup locations
 *
 * Example:
 * GET /search/locations?city=Pune&query=vi
 *
 * Returns matching pickup locations
 * =========================================================
 */
export const searchPickupLocations = async (req: Request, res: Response) => {

  try {

    const city = req.query.city as string;
    const query = (req.query.query as string || "").trim();

    if (!city || !query) {
      return res.status(400).json({
        success: false,
        message: "city and query are required"
      });
    }

    const sql = `
      SELECT DISTINCT
        v.pickup_location
      FROM vehicles v
      JOIN cities c ON c.id = v.city_id
      WHERE
        c.name = ?
        AND v.status = 'ACTIVE'
        AND v.pickup_location LIKE ?
      ORDER BY v.pickup_location ASC
      LIMIT 10
    `;

    const [rows] = await pool.execute(sql, [city, `${query}%`]);

    return res.status(200).json({
      success: true,
      data: rows
    });

  }
  catch (error) {

    console.error("searchPickupLocations error:", error);

    return res.status(500).json({
      success: false,
      message: "internal server error"
    });

  }
};

