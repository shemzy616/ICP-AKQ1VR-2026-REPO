import mongoose,{Schema,Document}from "mongoose";

export interface IBoard extends Document{
    name:string;
    userId:string;
    columns:mongoose.Types.ObjectId[];
    createdAt:Date;
    updatedAt:Date;
}

const BoardSchema:Schema= new Schema<IBoard>({
    name:{type:String,
        required:true},
    userId:{
        index:true,
        type:String,
        required:true},
    columns:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Column',
    }
],
    },
{
        timestamps:true,
    })

    export default mongoose.models.Board || mongoose.model<IBoard>('Board',BoardSchema)
    