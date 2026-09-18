import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { promises as fsp } from "fs";

import multer from "multer";

/**
 * =====================================================
 * Middleware: Upload de archivos clínicos
 * -----------------------------------------------------
 * Configuración de Multer para los adjuntos de una cita:
 *
 * - Solo PDF, JPG, JPEG y PNG.
 * - Máximo 10 MB por archivo.
 * - Máximo 5 archivos por cita (por request y en total).
 * - El nombre físico (storedName) siempre lo genera el
 *   servidor; nunca se usa el nombre del usuario para la
 *   ruta en disco.
 * - El directorio se ancla al módulo (no al cwd) y se puede
 *   sobreescribir con la variable de entorno UPLOADS_DIR
 *   (p. ej. los tests usan uploads-test para no tocar los
 *   uploads reales).
 *
 * Los archivos NO se sirven de forma pública: se accede
 * mediante endpoint autenticado.
 *
 * Proyecto: MarmaCitas
 * =====================================================
 */

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const MAX_FILES_PER_APPOINTMENT = 5;

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Directorio físico de los adjuntos. Anclado a
 * Backend/uploads/appointments (independiente del cwd del
 * proceso) y sobreescribible vía UPLOADS_DIR.
 */
export const getUploadsDir = () =>
  process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.resolve(moduleDir, "..", "uploads", "appointments");

/**
 * Limpiar archivos físicos guardados por Multer cuando una
 * validación o persistencia posterior falla.
 */
export const cleanupUploadedFiles = async (files) => {
  if (!files || files.length === 0) {
    return;
  }

  await Promise.allSettled(
    files.map((file) => fsp.unlink(file.path).catch(() => {})),
  );
};

const storage = multer.diskStorage({
  destination: async (req, file, callback) => {
    try {
      const uploadsDir = getUploadsDir();

      await fsp.mkdir(uploadsDir, { recursive: true });

      callback(null, uploadsDir);
    } catch (error) {
      callback(error);
    }
  },

  filename: (req, file, callback) => {
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    const safeExtension = ALLOWED_EXTENSIONS.includes(extension)
      ? extension
      : ".bin";

    const storedName = `${Date.now()}_${randomUUID()}${safeExtension}`;

    callback(null, storedName);
  },
});

const fileFilter = (req, file, callback) => {
  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  const validMime = ALLOWED_MIME_TYPES.has(file.mimetype);

  const validExtension = ALLOWED_EXTENSIONS.includes(extension);

  if (!validMime || !validExtension) {
    const error = new Error(
      "Tipo de archivo no permitido. Solo PDF, JPG, JPEG o PNG.",
    );

    return callback(error);
  }

  callback(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES_PER_APPOINTMENT,
  },
  fileFilter,
});

/**
 * Middleware listo para las rutas. Limpia los archivos que
 * Multer haya alcanzado a guardar si ocurre un error de
 * validación o límite.
 */
export const uploadAppointmentFiles = (req, res, next) => {
  upload.array("files", MAX_FILES_PER_APPOINTMENT)(
    req,
    res,
    async (error) => {
      if (error) {
        await cleanupUploadedFiles(req.files);

        let message = error.message;

        if (error.code === "LIMIT_FILE_SIZE") {
          message = "Cada archivo debe pesar máximo 10 MB.";
        } else if (
          error.code === "LIMIT_UNEXPECTED_FILE" ||
          error.code === "LIMIT_FILE_COUNT"
        ) {
          message = "Máximo 5 archivos por cita.";
        }

        return res.status(400).json({ message });
      }

      next();
    },
  );
};