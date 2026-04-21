import mongoose , {Document , Schema} from "mongoose";

export interface IUser extends Document {
    username : string;
    email : string;
    password? : string;
    role: string;
}

const schema : Schema<IUser> = new Schema(
    {
        username : { type : String , required : true },
        email : { type : String , required : true , unique : true },
        password: { type: String, required: true },
        role: { type: String, default: "user" }
    },
    { timestamps : true }
);

export const User = mongoose.model<IUser>("User" , schema);