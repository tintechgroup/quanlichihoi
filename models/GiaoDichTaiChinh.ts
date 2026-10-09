import mongoose, {
  Schema,
  Model,
  models,
  Types,
} from "mongoose";

export type LoaiGiaoDich = "THU" | "CHI";

export type PhamViTaiChinh =
  | "LIEN_CHI_HOI"
  | "CHI_HOI";

export interface IGiaoDichTaiChinh {
  loai: LoaiGiaoDich;

  phamVi: PhamViTaiChinh;

  chiHoiId?: Types.ObjectId | null;

  soTien: number;

  noiDung: string;

  ngayGiaoDich: Date;

  ghiChu?: string;

  nguoiTaoId: Types.ObjectId;

  nguoiTaoTen: string;

  chungTuUrl?: string;

  createdAt?: Date;

  updatedAt?: Date;
}

const GiaoDichTaiChinhSchema =
  new Schema<IGiaoDichTaiChinh>(
    {
      loai: {
        type: String,
        enum: ["THU", "CHI"],
        required: true,
      },

      phamVi: {
        type: String,
        enum: [
          "LIEN_CHI_HOI",
          "CHI_HOI",
        ],
        required: true,
      },

      chiHoiId: {
        type: Schema.Types.ObjectId,
        ref: "ChiHoi",
        default: null,
      },

      soTien: {
        type: Number,
        required: true,
        min: 0,
      },

      noiDung: {
        type: String,
        required: true,
        trim: true,
      },

      ngayGiaoDich: {
        type: Date,
        required: true,
      },

      ghiChu: {
        type: String,
        trim: true,
        default: "",
      },

      nguoiTaoId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      nguoiTaoTen: {
        type: String,
        required: true,
        trim: true,
      },

      chungTuUrl: {
        type: String,
        default: "",
      },
    },
    {
      timestamps: true,
    },
  );

const GiaoDichTaiChinh: Model<IGiaoDichTaiChinh> =
  (models.GiaoDichTaiChinh as Model<IGiaoDichTaiChinh>) ||
  mongoose.model<IGiaoDichTaiChinh>(
    "GiaoDichTaiChinh",
    GiaoDichTaiChinhSchema,
  );

export default GiaoDichTaiChinh;