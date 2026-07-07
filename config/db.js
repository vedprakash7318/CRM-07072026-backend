import mongoose from "mongoose";


const connectDB = async ()=>{
    try {
        const res = await mongoose.connect(process.env.DB_URI)
        
        console.log(`Database connected succefully!, 
            DB_HostName ->>>> ${res.connection.host}`)
    } catch (error) {
        console.error(`Database Connection Error ! type ${error.message}`)
    }
}
export default connectDB