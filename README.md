RUBYSHONG Backend

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white) ![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white) ![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white) ![Azure](https://img.shields.io/badge/Azure-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white)

<br />

엄마의 주얼리 브랜드 운영을 위해 만든 쇼핑몰 웹 애플리케이션의 백엔드 API 서버입니다.
상품 관리, 방문 예약, 고객 문의, 관리자 인증까지 실제 운영 흐름을 고려해 설계했습니다.



<br />
목차


프로젝트 소개
주요 기능
기술 스택
폴더 구조
프로젝트에서 신경 쓴 부분


<br />
프로젝트 소개

RUBYSHONG Backend는 주얼리 쇼핑몰의 상품, 예약, 문의 데이터를 관리하는 REST API 서버입니다.

단순 CRUD를 넘어서, 관리자가 상품을 등록·수정·삭제하고 예약과 문의 상태를 관리할 수 있도록 설계했습니다.
상품 삭제 이력, 문의 삭제 이력, 예약 상태 관리, 관리자 권한 분리 등 실제 운영 중 필요한 기능을 고려해 개발했습니다.

<br />
주요 기능

고객용 API


상품 목록/카테고리별 조회
상품 상세 조회
방문 예약 신청 및 가능 시간 조회
고객 문의 등록


관리자용 API


관리자 로그인 (JWT 인증)
상품 등록, 수정, 삭제
상품 이미지 업로드 (Azure Blob Storage)
상품 삭제 이력 조회
예약 목록 조회 및 상태 관리
문의 목록 조회 및 상태 관리
문의 삭제 이력 조회
관리자 권한별(owner/manager/staff) 기능 제한


<br />
기술 스택

구분스택RuntimeNode.jsFrameworkExpress 5.2LanguageTypeScript 6.0ORMPrisma 7.8 (@prisma/adapter-pg)DatabasePostgreSQL (pg 8.21)AuthJWT (jsonwebtoken 9.0), bcryptjsFile UploadMulter, Azure Blob Storage (@azure/storage-blob 12.31)DeployAzure, GitHub Actions

<details>
<summary>주요 패키지 버전 상세 보기</summary>
패키지버전용도express^5.2.1서버 프레임워크typescript^6.0.3정적 타입@prisma/client^7.8.0ORM 클라이언트@prisma/adapter-pg^7.8.0PostgreSQL 어댑터pg^8.21.0PostgreSQL 드라이버jsonwebtoken^9.0.3인증 토큰 발급/검증bcryptjs^3.0.3비밀번호 해싱multer^2.1.1파일 업로드 처리@azure/storage-blob^12.31.0이미지 스토리지cors^2.8.6CORS 설정dotenv^17.4.2환경 변수 관리

</details>
<br />
폴더 구조

📦rubyshong_backend
 ┣ 📂.github/workflows
 ┃ ┗ 📜main_app-rubyshong-api.yml   # CI/CD 파이프라인
 ┣ 📂prisma
 ┃ ┣ 📂migrations
 ┃ ┣ 📜schema.prisma                # DB 스키마
 ┃ ┗ 📜seed.ts                      # 초기 데이터 시딩
 ┣ 📂src
 ┃ ┣ 📂data
 ┃ ┣ 📂lib
 ┃ ┃ ┣ 📜prisma.ts                  # Prisma 클라이언트 인스턴스
 ┃ ┃ ┗ 📜upload.ts                  # 업로드 유틸
 ┃ ┣ 📂middlewares
 ┃ ┃ ┣ 📜adminAuth.middleware.ts    # 관리자 인증
 ┃ ┃ ┣ 📜role.middleware.ts         # 권한 체크
 ┃ ┃ ┗ 📜upload.middleware.ts       # 파일 업로드 처리
 ┃ ┣ 📂routes
 ┃ ┃ ┣ 📜admin.routes.ts
 ┃ ┃ ┣ 📜contact.routes.ts
 ┃ ┃ ┣ 📜product.routes.ts
 ┃ ┃ ┗ 📜reservation.routes.ts
 ┃ ┣ 📂types
 ┃ ┃ ┣ 📜express.d.ts
 ┃ ┃ ┗ 📜product.ts
 ┃ ┗ 📜server.ts                    # 서버 엔트리 포인트
 ┗ 📜.env

<br />
프로젝트에서 신경 쓴 부분

실제 운영을 고려한 관리자 API

상품, 예약, 문의 데이터를 단순히 조회하는 것에서 끝내지 않고, 관리자가 직접 운영할 수 있도록 등록·수정·삭제·상태 변경 API를 구현했습니다.

삭제 이력 관리

상품과 문의는 실제 삭제되지만, 누가 언제 어떤 데이터를 삭제했는지 확인할 수 있도록 삭제 로그를 별도 테이블에 저장하고 조회 API를 제공합니다.

예약 시간 중복 방지

예약 가능한 시간을 정해두고, 이미 예약된 시간은 DB 레벨과 API 로직에서 이중으로 검증하여 중복 예약을 방지했습니다.

관리자 권한 분리

owner, manager, staff로 역할을 구분하고, 미들웨어에서 권한별로 접근 가능한 API를 제한했습니다.

이미지 스토리지 분리

상품 이미지는 서버에 직접 저장하지 않고 Azure Blob Storage에 업로드하여 서버 부하와 배포 시 데이터 유실 위험을 줄였습니다.

<br />