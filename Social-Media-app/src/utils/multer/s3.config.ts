import { StorageEnum } from "./cloud.multer";
import { v4 as uuid } from "uuid";
import {
  DeleteObjectCommand,
  DeleteObjectCommandOutput,
  DeleteObjectsCommand,
  DeleteObjectsCommandOutput,
  GetObjectCommand,
  ListObjectsV2Command,
  ObjectCannedACL,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createReadStream } from "node:fs";
import { BadRequestException } from "../response/error.response";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3Config = () => {
  return new S3Client({
    region: process.env.AWS_REGION as string,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
  });
};

export const uploadFile = async ({
  storageApproach = StorageEnum.memory,
  Bucket = process.env.AWS_BUCKET_NAME,
  ACL = "private",
  path = "general",
  file,
}: {
  storageApproach?: StorageEnum.memory;
  Bucket?: string;
  ACL?: ObjectCannedACL;
  path?: string;
  file: Express.Multer.File;
}): Promise<string> => {
  console.log({
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    bufferLength: file.buffer?.length,
    hasPath: !!file.path,
    path: file.path,
  });

  let fileContent;

  if (file.buffer) {
    // Memory storage
    fileContent = file.buffer;
    console.log("Using memory storage (buffer)");
  } else if (file.path) {
    // Disk storage
    fileContent = createReadStream(file.path);
    console.log("Using disk storage (file path)");
  } else {
    throw new BadRequestException(
      "No file content available (neither buffer nor path)"
    );
  }

  const command = new PutObjectCommand({
    Bucket,
    Key: `${process.env.APPLICATION_NAME}/${path}/${uuid()}_${
      file.originalname
    }`,
    Body: fileContent,
    ACL,
    ContentType: file.mimetype,
  });

  try {
    const result = await s3Config().send(command);
    console.log("Upload successful:", result);

    if (!command.input.Key) {
      throw new BadRequestException("Fail To Generate Upload Key");
    }

    return command.input.Key;
  } catch (error) {
    console.error("S3 Upload Error:", error);
    throw new BadRequestException(`Upload failed: ${error}`);
  }
};

export const uploadFiles = async ({
  storageApproach = StorageEnum.memory,
  Bucket = process.env.AWS_BUCKET_NAME as string,
  ACL = "private",
  path = "general",
  files,
  useLarge = false,
}: {
  storageApproach?: StorageEnum.memory;
  Bucket?: string;
  ACL?: ObjectCannedACL;
  path?: string;
  files: Express.Multer.File[];
  useLarge?: boolean;
}): Promise<string[]> => {
  if (!files || files.length === 0) {
    throw new BadRequestException("No files provided");
  }

  const urls: string[] = await Promise.all(
    files.map((file) =>
      useLarge
        ? uploadLargeFile({
            storageApproach,
            Bucket,
            ACL,
            path,
            file,
          })
        : uploadFile({
            storageApproach,
            Bucket,
            ACL,
            path,
            file,
          })
    )
  );

  return urls;
};

export const uploadLargeFile = async ({
  storageApproach = StorageEnum.memory,
  Bucket = process.env.AWS_BUCKET_NAME,
  ACL = "private",
  path = "general",
  file,
}: {
  storageApproach?: StorageEnum.memory;
  Bucket?: string;
  ACL?: ObjectCannedACL;
  path?: string;
  file: Express.Multer.File;
}): Promise<string> => {
  let fileContent;

  if (file.buffer) {
    fileContent = file.buffer;
  } else if (file.path) {
    fileContent = createReadStream(file.path);
  } else {
    throw new BadRequestException("No file content available");
  }

  const upload = new Upload({
    client: s3Config(),
    params: {
      Bucket,
      Key: `${process.env.APPLICATION_NAME}/${path}/${uuid()}_${
        file.originalname
      }`,
      Body: fileContent,
      ACL,
      ContentType: file.mimetype,
    },
  });

  upload.on("httpUploadProgress", (progress) => {
    console.log(`upload File progress is ::::`, progress);
  });

  try {
    const { Key } = await upload.done();
    if (!Key) {
      throw new BadRequestException("Fail To Generate Upload Key");
    }
    return Key;
  } catch (error) {
    console.error("Upload error:", error);
    throw new BadRequestException(`Upload failed: ${error}`);
  }
};

export const createPreSignedUploadLink = async ({
  Bucket = process.env.AWS_BUCKET_NAME as string,
  path = "general",
  ContentType,
  originalname,
  expiresIn = Number(process.env.AWS_PRE_SIGNED_URL_EXPIRES_IN_SECOND),
}: {
  Bucket?: string;
  path?: string;
  originalname: string;
  ContentType: string;
  expiresIn?: number;
}): Promise<{ url: string; key: string }> => {
  const command = new PutObjectCommand({
    Bucket,
    Key: `${
      process.env.APPLICATION_NAME
    }/${path}/${uuid()}_pre_${originalname}`,
    ContentType,
  });
  const url = await getSignedUrl(s3Config(), command, { expiresIn: 300 });
  if (!url || !command?.input?.Key) {
    throw new BadRequestException("Fail To Create Pre signed url");
  }
  return { url, key: command.input.Key };
};


export const getFile = async ({
  Bucket = process.env.AWS_BUCKET_NAME as string,
  Key,
}: {
  Bucket?: string;
  Key: string;
}) => {
  const command = new GetObjectCommand({
    Bucket,
    Key,
  });
  return await s3Config().send(command)
};



export const deleteFile  = async({
  Bucket=process.env.AWS_BUCKET_NAME as string,
  Key
}:{
  Bucket?:string,
  Key:string
}):Promise<DeleteObjectCommandOutput> =>{
  
  const command = new DeleteObjectCommand({
    Bucket,
    Key,
  })
  return await s3Config().send(command)
}



export const deleteFiles = async ({
  Bucket = process.env.AWS_BUCKET_NAME as string,
  urls,
  Quiet = false,
}: {
  Bucket?: string;
  urls: string[];
  Quiet?: boolean;
}): Promise<DeleteObjectsCommandOutput> => {
  const objects = urls.map((url) => ({
    Key: url,
  }));

  const command = new DeleteObjectsCommand({
    Bucket,
    Delete: {
      Objects: objects,
      Quiet,
    },
  });

  return await s3Config().send(command);
};


export const listDirectoryFiles = async({Bucket= process.env.AWS_BUCKET_NAME as string, path}:{Bucket?:string, path:string}) =>{

  const command = new ListObjectsV2Command({
    Bucket,
    Prefix:`${process.env.APPLICATION_NAME}/${path}`,

  })

  return s3Config().send(command)
}

