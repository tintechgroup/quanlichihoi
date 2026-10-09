import mongoose, {
  Model,
  Schema,
  Types,
} from "mongoose";

export type TrangThaiVanKienUpload =
  | "TAM"
  | "DA_GAN";

export interface IVanKienUploadTam {
  pathname: string;

  fileUrl: string;

  tenFile: string;

  mimeType?: string;

  kichThuoc?: number;

  nguoiTaiLenId: Types.ObjectId;

  trangThai: TrangThaiVanKienUpload;

  createdAt?: Date;

  updatedAt?: Date;
}

const VanKienUploadTamSchema =
  new Schema<IVanKienUploadTam>(
    {
      pathname: {
        type: String,

        required: true,

        trim: true,

        unique: true,

        index: true,
      },

      fileUrl: {
        type: String,

        required: true,

        trim: true,

        index: true,
      },

      tenFile: {
        type: String,

        required: true,

        trim: true,

        maxlength: 255,
      },

      mimeType: {
        type: String,

        trim: true,

        default:
          "application/octet-stream",
      },

      kichThuoc: {
        type: Number,

        min: 0,

        default: 0,
      },

      nguoiTaiLenId: {
        type:
          Schema.Types.ObjectId,

        ref: "User",

        required: true,

        index: true,
      },

      trangThai: {
        type: String,

        enum: [
          "TAM",
          "DA_GAN",
        ],

        default:
          "TAM",

        index: true,
      },
    },
    {
      timestamps: true,

      collection:
        "van_kien_upload_tam",
    },
  );

VanKienUploadTamSchema.index({
  trangThai: 1,

  createdAt: 1,
});

VanKienUploadTamSchema.index({
  nguoiTaiLenId: 1,

  trangThai: 1,

  createdAt: -1,
});

const VanKienUploadTam:
  Model<IVanKienUploadTam> =
  (mongoose.models
    .VanKienUploadTam as
    Model<IVanKienUploadTam>) ||
  mongoose.model<IVanKienUploadTam>(
    "VanKienUploadTam",
    VanKienUploadTamSchema,
  );

export default VanKienUploadTam;