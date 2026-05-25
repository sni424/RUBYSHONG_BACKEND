import multer from 'multer';

// 메모리에 파일 저장
// 이후 Azure Blob으로 바로 업로드할 예정
const storage = multer.memoryStorage();

export const upload = multer({ storage });
