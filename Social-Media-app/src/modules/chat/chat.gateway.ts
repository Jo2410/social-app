import { Server } from "socket.io";
import { IAuthSocket } from "../gateway";
import { ChatEvents } from "./chat.events";

export class ChatGateway {
    private chatEvents: ChatEvents = new ChatEvents()
    constructor(){}

    register = (socket:IAuthSocket, io:Server) =>{
        this.chatEvents.sayHi(socket, io)
        this.chatEvents.sendMessage(socket, io)
    }
}