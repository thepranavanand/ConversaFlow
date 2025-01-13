import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import path from 'path';

let bucket;

export const initGridFS = (client) => {
  const db = client.db(process.env.MONGO_DB_NAME || 'chat-app');
  bucket = new GridFSBucket(db, {
    bucketName: 'fileUploads'
  });
  console.log('GridFS initialized successfully');
  return bucket;
};

export const getGridFSBucket = () => {
  if (!bucket) {
    throw new Error('GridFS bucket not initialized. Call initGridFS first.');
  }
  return bucket;
};

export const uploadFileToGridFS = (fileBuffer, filename, contentType) => {
  return new Promise((resolve, reject) => {
    // Check if bucket is initialized
    if (!bucket) {
      console.error('GridFS bucket not initialized. Call initGridFS first.');
      return reject(new Error('GridFS bucket not initialized'));
    }
    
    const uploadStream = bucket.openUploadStream(filename, {
      contentType,
      metadata: {
        uploadDate: new Date()
      }
    });

    uploadStream.on('error', (error) => {
      reject(error);
    });

    uploadStream.on('finish', () => {
      resolve({
        _id: uploadStream.id,
        filename: filename,
        contentType: contentType
      });
    });

    uploadStream.end(fileBuffer);
  });
};

export const getFileFromGridFS = (fileId) => {
  return bucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
};

export const getFileStream = (fileId) => {
  return bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
};

export const deleteFileFromGridFS = (fileId) => {
  return bucket.delete(new mongoose.Types.ObjectId(fileId));
}; 