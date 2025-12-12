import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'profolia-portfolios';

/**
 * Upload file to S3
 */
export async function uploadToS3(
  key: string,
  body: Buffer | string,
  contentType: string
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: 'public-read'
    });

    await s3Client.send(command);
    return `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
}

/**
 * Delete file from S3
 */
export async function deleteFromS3(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    await s3Client.send(command);
  } catch (error) {
    console.error('Error deleting from S3:', error);
    throw error;
  }
}

/**
 * Generate presigned URL for direct upload (allows client-side upload)
 */
export async function generatePresignedUrl(
  key: string,
  contentType: string
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType
    });

    return await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour expiry
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw error;
  }
}

/**
 * Upload portfolio HTML to S3
 */
export async function uploadPortfolioToS3(
  username: string,
  html: string,
  css?: string
): Promise<{ htmlUrl: string; cssUrl?: string }> {
  try {
    const htmlUrl = await uploadToS3(
      `portfolios/${username}/index.html`,
      html,
      'text/html'
    );

    let cssUrl: string | undefined;
    if (css) {
      cssUrl = await uploadToS3(
        `portfolios/${username}/styles.css`,
        css,
        'text/css'
      );
    }

    return { htmlUrl, cssUrl };
  } catch (error) {
    console.error('Error uploading portfolio:', error);
    throw error;
  }
}

/**
 * Generate S3 key for media upload
 */
export function generateMediaKey(profileId: string, fileName: string): string {
  const timestamp = Date.now();
  const hash = crypto.randomBytes(8).toString('hex');
  const extension = fileName.split('.').pop();
  return `media/${profileId}/${timestamp}-${hash}.${extension}`;
}

/**
 * List all files in a user's media folder
 */
export async function listUserMedia(profileId: string): Promise<string[]> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `media/${profileId}/`
    });

    const response = await s3Client.send(command);
    return response.Contents?.map(obj => obj.Key || '') || [];
  } catch (error) {
    console.error('Error listing media:', error);
    throw error;
  }
}
