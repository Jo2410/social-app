// setup ENV
import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve("./config/.env.development") });
// Load Express and Express Types
import type { Response, Express, Request } from "express";
import express from "express";
// import {promisify} from 'node:util'
// import {pipeline} from 'node:stream'
// const createS3WriteStreamPipe = promisify(pipeline)

// Third Party Middleware
 import { createPreSignedUploadLink, getFile } from './utils/multer/s3.config';
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";

import {authRouter, userRouter, postRouter, initializeIo} from './modules'

// import authController from "./modules/auth/auth.controller";
// import userController from "./modules/user/user.controller";



import connectDB from "./DB/connection.db";
import { BadRequestException, globalErrorHandling } from "./utils/response/error.response";
import { pipeline } from "node:stream";
import { promisify } from "node:util";
import { chatRouter } from "./modules/chat";
 const createS3WriteStream = promisify(pipeline);

// import { getFile, } from './utils/multer/s3.config'

const bootstrap = async (): Promise<void> => {
  const port: number | string = process.env.PORT || 5000;
  const app: Express = express();

  app.use(cors());
  app.use(express.json());
  app.use(helmet());
  const limiter = rateLimit({
    windowMs: 60 * 60000,
    limit: 2000,
    message: { error: "Too Many Request Please Try Again" },
    statusCode: 429,
  });
  app.use(limiter);




  //app-routing
  app.get("/", (req: Request, res: Response) => {
    res.json({
      message:
        `Welcome To ${process.env.APPLICATION_NAME} Backend Landing Page 😉`,
    });
  });
  //sub-app-routing-modules
  app.use("/auth", authRouter);
  app.use("/user", userRouter);
  app.use("/post", postRouter);
  app.use("/chat", chatRouter);

  //test-s3
  // app.get('/test', async(req:Request, res:Response) => {
  //     // const {Key} = req.query as {Key:string};
  //     // const result = await deleteFile({Key})

  //     // const result = await deleteFiles({urls:["SOCIAL_APP/users/68c1bdd0dbbe440d523568b4/18ba9b4f-bebf-475f-8870-adc0d47e93a4_3.jpeg","SOCIAL_APP/users/68c1bdd0dbbe440d523568b4/8097ce74-372d-4e2d-91ee-52e0ac73225c_WhatsApp Image 2025-01-10 at 11.33.53 AM.jpeg"]})

  //     const result = await listDirectoryFiles({path: `users/68c1bdd0dbbe440d523568b4`}) // delete folder

  //     if (!result?.Contents?.length) {
  //         throw new BadRequestException("Empty Directory ")
  //     }

  //     const urls:string[] = result.Contents.map(file=>{
  //         return file.Key as string
  //     })
  //     await deleteFiles({urls})
  //     return res.json({message:"Done", data:{urls}})
  // })

//  app.get("/upload/pre-signed/*path", 
//     async(req:Request, res:Response):Promise<Response> =>{
//         const {downloadName,download="false"}= req.query as {download?:string;downloadName?:string}
//     const {path} = req.params as unknown as {path:string[]}
//     const Key = path.join("/")
//     const url = await createPreSignedUploadLink({ Key:Key as string ,downloadName:downloadName as string,download });
//     return res.json({message:"done", data:{url}})
// })

app.get("/upload/*path", async (req:Request, res:Response):Promise<void> =>{
    const {path} = req.params as unknown as {path:string[]}
    const Key = path.join("/")
    const s3Response = await getFile({ Key });
    console.log(s3Response.Body);
    
    if (!s3Response?.Body) {
        throw new BadRequestException("fail to get file from s3")
    }
    res.set("Cross-Origin-Resource-Policy", "cross-origin")
    res.setHeader("Content-Disposition", `"attachment; filename="${Key.split("/").pop()}"`)
    res.setHeader("Content-Type", s3Response.ContentType as string)
    return await createS3WriteStream(s3Response.Body as NodeJS.ReadableStream, res)
})
  //global-error-handling
  app.use(globalErrorHandling);

  //In-Valid Routing
  app.use("{/*dummy}", (req: Request, res: Response) => {
    return res.status(404).json({ message: "In-Valid-application Routing" });
  });

  //Hooks
  // async function test() {
  //   try {
  // //     const userModel = new UserRepository(UserModel);
  // // const user = await userModel.insertMany({
  // //       data: [
  // //         {
  // //           username: "Ehab Tarek",
  // //           email: `${Date.now()}@gmail.com`,
  // //           password: "123456",
  // //         },
  // //         {
  // //           username: "Hossam Tarek",
  // //           email: `${Date.now()}kojjvf@gmail.com`,
  // //           password: "123456",
  // //         },
  // //       ],
  // //     });
  // //     console.log({ result: user });
  //   } catch (error) {
  //     console.log(error);
  //   }
  // }
  // test();
  //DB
  await connectDB();


  const httpServer =  app.listen(port, () => {
    console.log(`Server Is Running on Port:${port} ✔`);
  });
  initializeIo(httpServer)

};

export default bootstrap;
