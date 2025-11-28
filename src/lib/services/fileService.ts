import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  UploadMetadata,
} from "firebase/storage";
import { storage } from "@/lib/firebase";
import { UploadFileData, FileUploadResult, DeleteFileData } from "@/types/file";
import { AppError } from "@/utils/handleError";
import { MAX_FILE_SIZE } from "@/utils/constants";

export class FileService {
  async uploadFile(data: UploadFileData): Promise<FileUploadResult> {
    try {
      const { file, path, metadata } = data;

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw new AppError(
          `El archivo es muy grande. Tamaño máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          "FILE_TOO_LARGE",
          400
        );
      }

      // Create storage reference
      const storageRef = ref(storage, `${path}/${file.name}`);

      // Upload metadata
      const uploadMetadata: UploadMetadata = {
        contentType: file.type,
        customMetadata: metadata,
      };

      // Upload file
      const snapshot = await uploadBytes(storageRef, file, uploadMetadata);

      // Get download URL
      const url = await getDownloadURL(snapshot.ref);

      return {
        url,
        path: snapshot.ref.fullPath,
        name: file.name,
        size: file.size,
        type: file.type,
      };
    } catch (error) {
      console.error("Error uploading file:", error);
      if (error instanceof AppError) throw error;
      throw new AppError("Error al subir el archivo");
    }
  }

  async deleteFile(data: DeleteFileData): Promise<void> {
    try {
      const { path } = data;
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
    } catch (error) {
      console.error("Error deleting file:", error);
      throw new AppError("Error al eliminar el archivo");
    }
  }

  async getFileUrl(path: string): Promise<string> {
    try {
      const storageRef = ref(storage, path);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error("Error getting file URL:", error);
      throw new AppError("Error al obtener la URL del archivo");
    }
  }
}

export const fileService = new FileService();
