import { BlobServiceClient } from '@azure/storage-blob';

// Azure Storage 연결 문자열
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;

// 업로드할 컨테이너 이름
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME!;

// Blob Service Client 생성
const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

// products 컨테이너 가져오기
const containerClient = blobServiceClient.getContainerClient(containerName);

// Azure Blob Storage 업로드 함수
export const uploadImageToAzure = async (file: Express.Multer.File) => {
  // 파일 이름 중복 방지
  const fileName = `${Date.now()}-${file.originalname}`;

  // Blob 파일 생성
  const blockBlobClient = containerClient.getBlockBlobClient(fileName);

  // Azure에 파일 업로드
  await blockBlobClient.uploadData(file.buffer);

  // 업로드 완료된 이미지 URL 반환
  return blockBlobClient.url;
};
