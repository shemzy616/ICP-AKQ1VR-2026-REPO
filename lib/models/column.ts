import mongoose,{Schema,Document}from "mongoose";

export interface IColumn extends Document{
    name:string;
    boardId:mongoose.Types.ObjectId;
    order:number;
    JobApplications:mongoose.Types.ObjectId[];
    createdAt:Date;
    updatedAt:Date;
}

const ColumnSchema = new Schema<IColumn>(
    {
    name:{
        type:String,
        required:true
    },
    boardId:{
        
        type:Schema.Types.ObjectId,
        index:true,
        ref: 'Board',
        required:true
    },
    order:{
        type:Number,
        required:true,
        default:0
    },
    JobApplications:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'JobApplication',
    }
],
    },
{
        timestamps:true,
    })

    export default mongoose.models.Column || mongoose.model<IColumn>('Column',ColumnSchema)
    
