import mongoose,{Schema,Document}from "mongoose";

interface ICustomField {
    key: string;
    value: string;
}

export interface IJobApplication extends Document{
    company:string;
    position:string;
    status:string;
    notes?:string;
    location?:string;
    cvVersion?:string;
    coverLetterVersion?:string;
    cvDocumentId?:mongoose.Types.ObjectId;
    coverLetterDocumentId?:mongoose.Types.ObjectId;
    cvFileName?:string;
    coverLetterFileName?:string;
    userId:string;
    description?:string;
    columnId:mongoose.Types.ObjectId;
    order:number;
    boardId:mongoose.Types.ObjectId;
    jobUrl?:string;
    appliedDate?:Date;
    tags?:string[];
    salary?:string;
    customFields?:ICustomField[];
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
    cvVersion:{
        type:String,
        trim:true,
    },
    coverLetterVersion:{
        type:String,
        trim:true,
    },
    cvDocumentId:{
        type:Schema.Types.ObjectId,
        ref:'JobApplicationDocument',
    },
    coverLetterDocumentId:{
        type:Schema.Types.ObjectId,
        ref:'JobApplicationDocument',
    },
    cvFileName:{
        type:String,
        trim:true,
    },
    coverLetterFileName:{
        type:String,
        trim:true,
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
        type:String,
    },
    customFields:[{
        key:{
            type:String,
            trim:true,
        },
        value:{
            type:String,
            trim:true,
        },
    }],
    },
{
        timestamps:true,
    })  

    

    

    export default mongoose.models.JobApplication || mongoose.model<IJobApplication>('JobApplication',JobApplicationSchema)
    
