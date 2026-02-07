import mongoose,{Schema,Document}from "mongoose";

export interface IJobApplication extends Document{
    company:string;
    position:string;
    status:string;
    notes?:string;
    location?:string;
    userId:string;
    description?:string;
    columnId:mongoose.Types.ObjectId;
    order:number;
    boardId:mongoose.Types.ObjectId;
    jobUrl?:string;
    appliedDate?:Date;
    tags?:string[];
    salary?:number;
    createdAt:Date;
    updatedAt:Date;
}

const JobApplicationSchema = new Schema<IJobApplication>(
    {
    company:{
        type:String,
        required:true
    },
     position:{
        type:String,
        required:true
    },
    status:{
        type:String,
        required:true,
        default:'Applied',
    },
    notes:{
        type:String,
    },
    location:{
        type:String,
    },
    userId:{
        index:true,
        type:String,
        required:true
    },
    description:{
        type:String,
    },
    columnId:{
        type:Schema.Types.ObjectId,
        index:true,
        ref: 'Column',
        required:true
    },
    order:{
        type:Number,
        required:true,
        default:0
    },
    boardId:{

        type:Schema.Types.ObjectId,
        index:true,
        ref: 'Board',
        required:true
    },
    jobUrl:{
        type:String,
    },
    appliedDate:{
        type:Date,
    },
    tags:[{
        type:String,
    }],
    salary:{
        type:Number,
    },
    },
{
        timestamps:true,
    })  

    

    

    export default mongoose.models.JobApplication || mongoose.model<IJobApplication>('JobApplication',JobApplicationSchema)
    
