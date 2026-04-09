import { minioClient, BUCKET } from "../storage/minioclient";
import { randomUUID } from "crypto";
import { pool } from "../config/db";

type Inspection = {
  booking_id:     string;
  vehicle_id:     string;
  start_time:     string;
  end_time:       string;
  start_uploaded: boolean;
  end_uploaded:   boolean;
};

export const uploadInspectionImages = async (
  bookingId:  string,
  operatorId: number,
  files:      Express.Multer.File[],
  type:       "start" | "end"
): Promise<string[]> => {
  if (!files?.length) throw new Error("No files uploaded");

  const inspection = await getInspection(bookingId);
  if (!inspection) throw new Error("Booking not found");

  if (type === "end" && !inspection.start_uploaded) {
    throw new Error("Start images must be uploaded before end images");
  }

  const now = new Date();
  if (type === "start" && now < new Date(inspection.start_time)) throw new Error("Too early — booking has not started yet");
  if (type === "end"   && now < new Date(inspection.end_time))   throw new Error("Too early — booking has not ended yet");

  const uploadedUrls: string[] = [];

  for (const file of files) {
    const safeName   = file.originalname.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
    const objectName = `booking_${bookingId}/${type}/${randomUUID()}_${safeName}`;
    await minioClient.putObject(BUCKET, objectName, file.buffer, file.size);
    uploadedUrls.push(`http://localhost:9000/${BUCKET}/${objectName}`);
  }

  const fields = type === "start" ? "start_uploaded = ?" : "end_uploaded = ?";
  await pool.execute(
    `UPDATE vehicle_inspections SET ${fields} WHERE booking_id = ?`,
    [true, bookingId]
  );

  console.log(`[Inspection] operatorId=${operatorId} uploaded ${type} for bookingId=${bookingId}`);
  return uploadedUrls;
};

export const createInspection = async (data: {
  bookingId: string;
  vehicleId: string;
  startTime: string;
  endTime:   string;
}): Promise<void> => {
  try {
    await pool.execute(
      `INSERT INTO vehicle_inspections (booking_id, vehicle_id, start_time, end_time) VALUES (?, ?, ?, ?)`,
      [data.bookingId, data.vehicleId, data.startTime, data.endTime]
    );
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") return;
    throw err;
  }
};

export const getInspection = async (bookingId: string): Promise<Inspection | null> => {
  const [rows]: any = await pool.execute(
    `SELECT * FROM vehicle_inspections WHERE booking_id = ?`,
    [bookingId]
  );
  return rows[0] ?? null;
};