import {z} from "zod";
import { freezeAccount, logout } from "./user.validation";


export type ILogoutDto = z.infer<typeof logout.body>
export type IFreezeAccountDto = z.infer<typeof freezeAccount.params>