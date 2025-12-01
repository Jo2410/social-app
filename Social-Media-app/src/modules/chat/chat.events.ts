import { Server } from "socket.io";
import { IAuthSocket } from "../gateway";
import { ChatService } from "./chat.service";


export class ChatEvents {
    private chatService:ChatService = new ChatService()
    constructor(){}

    sayHi = (socket:IAuthSocket, io:Server) => {
        return socket.on("sayHi", (message:string, callback) => {
        this.chatService.sayHi({message , socket , callback, io})
    }); 
    }


    sendMessage = (socket:IAuthSocket, io:Server) => {
        return socket.on("sendMessage", (data:{content:string; sendTo:string}) => {
        this.chatService.sendMessage({...data , socket , io})
    }); 
    }
}