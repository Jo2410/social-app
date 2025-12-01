import {connect} from 'mongoose'
import { UserModel } from './model/User.model';

const connectDB = async ():Promise<void> =>{
    try {
        const result = await connect(process.env.DB_URI as string, {
            serverSelectionTimeoutMS:30000,
        })

        await UserModel.syncIndexes()
        console.log(result.models);
        console.log("DB connected successfully 💚");
        

    } catch (error) {
        console.log(`Fail To Connect on DB ☠`);
        
    }
}

export default connectDB