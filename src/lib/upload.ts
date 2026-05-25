import { BlobServiceClient } from '@azure/storage-blob';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

if (!connectionString) {
  throw new Error('AZURE_STORAGE_CONNECTION_STRING is missing');
}

if (!containerName) {
  throw new Error('AZURE_STORAGE_CONTAINER_NAME is missing');
}

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);

export const uploadImageToAzure = async (file: Express.Multer.File) => {
  const fileName = `${Date.now()}-${file.originalname}`;
  const blockBlobClient = containerClient.getBlockBlobClient(fileName);

  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: {
      blobContentType: file.mimetype,
    },
  });

  return blockBlobClient.url;
};
