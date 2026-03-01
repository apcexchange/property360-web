import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { config } from '../config';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
}

export interface RawUploadResult {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
  resourceType: string;
}

class CloudinaryService {
  /**
   * Upload an image from a file path
   */
  async uploadImage(
    filePath: string,
    folder: string = 'properties'
  ): Promise<UploadResult> {
    try {
      const result: UploadApiResponse = await cloudinary.uploader.upload(filePath, {
        folder: `property360/${folder}`,
        resource_type: 'image',
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error('Failed to upload image to Cloudinary');
    }
  }

  /**
   * Upload an image from a base64 string
   */
  async uploadBase64Image(
    base64Data: string,
    folder: string = 'properties'
  ): Promise<UploadResult> {
    try {
      const result: UploadApiResponse = await cloudinary.uploader.upload(base64Data, {
        folder: `property360/${folder}`,
        resource_type: 'image',
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error('Failed to upload image to Cloudinary');
    }
  }

  /**
   * Delete an image by public ID
   */
  async deleteImage(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      return false;
    }
  }

  /**
   * Get optimized URL with transformations
   */
  getOptimizedUrl(
    publicId: string,
    options: { width?: number; height?: number; crop?: string } = {}
  ): string {
    return cloudinary.url(publicId, {
      secure: true,
      transformation: [
        {
          width: options.width,
          height: options.height,
          crop: options.crop || 'fill',
          quality: 'auto',
          fetch_format: 'auto',
        },
      ],
    });
  }

  /**
   * Get thumbnail URL
   */
  getThumbnailUrl(publicId: string, size: number = 200): string {
    return this.getOptimizedUrl(publicId, {
      width: size,
      height: size,
      crop: 'fill',
    });
  }

  /**
   * Upload a raw file (PDF, DOCX, etc.)
   */
  async uploadRawFile(
    filePath: string,
    folder: string = 'agreements'
  ): Promise<RawUploadResult> {
    try {
      const result: UploadApiResponse = await cloudinary.uploader.upload(filePath, {
        folder: `property360/${folder}`,
        resource_type: 'raw',
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format || '',
        bytes: result.bytes,
        resourceType: result.resource_type,
      };
    } catch (error) {
      console.error('Cloudinary raw upload error:', error);
      throw new Error('Failed to upload file to Cloudinary');
    }
  }

  /**
   * Delete a raw file by public ID
   */
  async deleteRawFile(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'raw',
      });
      return result.result === 'ok';
    } catch (error) {
      console.error('Cloudinary raw delete error:', error);
      return false;
    }
  }
}

export default new CloudinaryService();
