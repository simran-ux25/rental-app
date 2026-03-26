import { Request, Response } from "express";
import { pool } from "../config/db";
import { v4 as uuidv4 } from "uuid";

/* -----------------------------
   Add Vehicle Controller
--------------------------------*/

export const addVehicle = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { user_id, role } = req.user;

    if (role !== "OWNER") {
      return res.status(403).json({ error: "Access denied" });
    }

    const {
      registration_number,
      name,
      manufacture_year,
      fuel_type,
      price_per_hour,
      city_id,
      deposit_required,
      deposit_amount
    } = req.body;

    if (typeof registration_number !== "string") {
      return res.status(400).json({ error: "Registration number must be string" });
    }

    const normalizedPlate = registration_number.trim().toUpperCase();
    const plateRegex = /^[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}$/;

    if (!plateRegex.test(normalizedPlate)) {
      return res.status(400).json({
        error: "Invalid registration format. Example: MH12AB1234"
      });
    }

    if (typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Name must be non-empty string" });
    }

    if (!Number.isInteger(manufacture_year)) {
      return res.status(400).json({ error: "Manufacture year must be integer" });
    }

    const currentYear = new Date().getFullYear();

    if (manufacture_year < 2000 || manufacture_year > currentYear) {
      return res.status(400).json({ error: "Invalid manufacture year" });
    }

    if (!["FUEL", "ELECTRIC"].includes(fuel_type)) {
      return res.status(400).json({ error: "Invalid fuel type" });
    }

    if (typeof price_per_hour !== "number" || price_per_hour <= 0) {
      return res.status(400).json({ error: "Invalid price_per_hour" });
    }

    if (typeof city_id !== "number") {
      return res.status(400).json({ error: "Invalid city_id" });
    }

    const [cityRows]: any = await pool.execute(
      `SELECT id FROM cities WHERE id = ? AND is_active = TRUE`,
      [city_id]
    );

    if (cityRows.length === 0) {
      return res.status(400).json({ error: "Invalid or inactive city" });
    }

    if (deposit_required === true && deposit_amount <= 0) {
      return res.status(400).json({ error: "Deposit amount must be > 0" });
    }

    if (deposit_required === false && deposit_amount !== 0) {
      return res.status(400).json({
        error: "Deposit amount must be 0 when deposit not required"
      });
    }

    const vehicleId = uuidv4();

    await pool.execute(
      `
      INSERT INTO vehicles (
        id,
        user_id,
        registration_number,
        name,
        manufacture_year,
        fuel_type,
        price_per_hour,
        city_id,
        deposit_required,
        deposit_amount,
        owner_status,
        booking_status
      )
      VALUES (
        UUID_TO_BIN(?, 1),
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        'ACTIVE',
        'AVAILABLE'
      )
      `,
      [
        vehicleId,
        user_id,
        normalizedPlate,
        name.trim(),
        manufacture_year,
        fuel_type,
        price_per_hour,
        city_id,
        deposit_required,
        deposit_amount
      ]
    );

    return res.status(201).json({
      vehicle_id: vehicleId,
      message: "Vehicle created successfully"
    });

  } catch (error: any) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: "Vehicle with this registration number already exists"
      });
    }

    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


/* -----------------------------
   Update Vehicle
--------------------------------*/

export const updateVehicle = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const ownerId = Number(req.user.user_id);
    const { vehicleId } = req.params;

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    // ✅ FIXED: Proper type narrowing
    if (
      typeof vehicleId !== "string" ||
      !uuidRegex.test(vehicleId)
    ) {
      return res.status(400).json({
        error: "Invalid vehicle ID format"
      });
    }

    const {
  owner_status,
  price_per_hour,
  deposit_required,
  deposit_amount
} = req.body || {};

    if (
      owner_status === undefined &&
      price_per_hour === undefined &&
      deposit_required === undefined &&
      deposit_amount === undefined
    ) {
      return res.status(400).json({
        error: "Provide at least one field to update"
      });
    }

    if (
      owner_status !== undefined &&
      !["ACTIVE", "MAINTENANCE"].includes(owner_status)
    ) {
      return res.status(400).json({
        error: "Invalid owner_status"
      });
    }

    if (
      price_per_hour !== undefined &&
      (typeof price_per_hour !== "number" || price_per_hour <= 0)
    ) {
      return res.status(400).json({
        error: "Invalid price_per_hour"
      });
    }

    if (deposit_required === true) {
      if (
        deposit_amount === undefined ||
        typeof deposit_amount !== "number" ||
        deposit_amount <= 0
      ) {
        return res.status(400).json({
          error: "deposit_amount required and must be > 0 when deposit_required = true"
        });
      }
    }

    if (deposit_required === false) {
      if (deposit_amount !== undefined && deposit_amount !== 0) {
        return res.status(400).json({
          error: "deposit_amount must be 0 when deposit_required = false"
        });
      }
    }

    const [rows]: any = await pool.execute(
      `
      SELECT user_id, owner_status, booking_status
      FROM vehicles
      WHERE id = UUID_TO_BIN(?, 1)
      `,
      [vehicleId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: "Vehicle not found"
      });
    }

    const vehicle = rows[0];

    if (Number(vehicle.user_id) !== ownerId) {
      return res.status(403).json({
        error: "Not your vehicle"
      });
    }

    if (vehicle.owner_status === "DELETED") {
      return res.status(400).json({
        error: "Cannot update deleted vehicle"
      });
    }

    if (
      owner_status === "MAINTENANCE" &&
      vehicle.booking_status === "BOOKED"
    ) {
      return res.status(400).json({
        error: "Cannot switch to maintenance while vehicle is booked"
      });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (owner_status !== undefined) {
      updates.push("owner_status = ?");
      values.push(owner_status);
    }

    if (price_per_hour !== undefined) {
      updates.push("price_per_hour = ?");
      values.push(price_per_hour);
    }

    if (deposit_required !== undefined) {
      updates.push("deposit_required = ?");
      values.push(deposit_required);
    }

    if (deposit_amount !== undefined) {
      updates.push("deposit_amount = ?");
      values.push(deposit_amount);
    }

    values.push(vehicleId);

    await pool.execute(
      `
      UPDATE vehicles
      SET ${updates.join(", ")}
      WHERE id = UUID_TO_BIN(?, 1)
      `,
      values
    );

    return res.status(200).json({
      message: "Vehicle updated successfully"
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Internal server error"
    });
  }
};

export const deleteVehicle = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const ownerId = Number(req.user.user_id);
    const { vehicleId } = req.params;

    // 🔹 Strict UUID validation
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (typeof vehicleId !== "string" || !uuidRegex.test(vehicleId)) {
      return res.status(400).json({
        error: "Invalid vehicle ID format"
      });
    }

    // 🔹 Fetch vehicle with booking state
    const [rows]: any = await pool.execute(
      `
      SELECT user_id, owner_status, booking_status
      FROM vehicles
      WHERE id = UUID_TO_BIN(?, 1)
      `,
      [vehicleId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: "Vehicle not found"
      });
    }

    const vehicle = rows[0];

    // 🔹 Ownership enforcement
    if (Number(vehicle.user_id) !== ownerId) {
      return res.status(403).json({
        error: "You can delete only your own vehicles"
      });
    }

    // 🔹 Already deleted (idempotent protection)
    if (vehicle.owner_status === "DELETED") {
      return res.status(400).json({
        error: "Vehicle already deleted"
      });
    }

    // 🔹 Prevent deletion while booked
    if (vehicle.booking_status === "BOOKED") {
      return res.status(400).json({
        error: "Cannot delete vehicle while it is booked"
      });
    }

    // 🔹 Soft delete
    await pool.execute(
      `
      UPDATE vehicles
      SET owner_status = 'DELETED'
      WHERE id = UUID_TO_BIN(?, 1)
      `,
      [vehicleId]
    );

    return res.status(200).json({
      message: "Vehicle deleted successfully"
    });

  } catch (error) {
    console.error("Delete vehicle error:", error);

    return res.status(500).json({
      error: "Internal server error"
    });
  }
};

export const getVehicleById = async (
  req: Request,
  res: Response
) => {
console.log("Auth header:");

  try {
    console.log("Auth header:");
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
console.log("Auth header:", req.headers.authorization);
    const requesterId = Number(req.user.user_id);
    const requesterRole = req.user.role;
    const { vehicleId } = req.params;

    // 🔹 UUID validation
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (typeof vehicleId !== "string" || !uuidRegex.test(vehicleId)) {
      return res.status(400).json({
        error: "Invalid vehicle ID format"
      });
    }

    const [rows]: any = await pool.execute(
      `
      SELECT
        BIN_TO_UUID(id, 1) AS id,
        user_id,
        registration_number,
        name,
        manufacture_year,
        fuel_type,
        price_per_hour,
        city_id,
        deposit_required,
        deposit_amount,
        owner_status,
        booking_status,
        created_at,
        updated_at
      FROM vehicles
      WHERE id = UUID_TO_BIN(?, 1)
      `,
      [vehicleId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: "Vehicle not found"
      });
    }

    const vehicle = rows[0];

    // 🔹 Deleted vehicles are hidden
    if (vehicle.owner_status === "DELETED") {
      return res.status(404).json({
        error: "Vehicle not found"
      });
    }

    // 🔹 Owner can view their own vehicle
    if (requesterRole === "OWNER" && vehicle.user_id === requesterId) {
      return res.status(200).json(vehicle);
    }

    // 🔹 Renter can only view rentable vehicles
    if (
      requesterRole === "RENTER" &&
      vehicle.owner_status === "ACTIVE" &&
      vehicle.booking_status === "AVAILABLE"
    ) {
      return res.status(200).json(vehicle);
    }

    return res.status(403).json({
      error: "Access denied"
    });

  } catch (error) {
    console.error("Get vehicle error:", error);
    return res.status(500).json({
      error: "Internal server error"
    });
  }
};