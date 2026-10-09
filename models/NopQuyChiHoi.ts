import mongoose, {
  Schema,
  Model,
  models,
  Types,
} from "mongoose";

export type TrangThaiNopQuy =
  | "CHO_DUYET"
  | "DA_DUYET"
  | "TU_CHOI";

export interface INopQuyChiHoi {
  chiHoiId: Types.ObjectId;

  tenChiHoiSnapshot: string;

  soTien: number;

  noiDung: string;

  ghiChu?: string;

  ngayNop: Date;

  trangThai: TrangThaiNopQuy;

  nguoiTaoId: Types.ObjectId;

  nguoiTaoTen: string;

  nguoiDuyetId?: Types.ObjectId | null;

  nguoiDuyetTen?: string;

  ngayDuyet?: Date | null;

  lyDoTuChoi?: string;

  giaoDichTaiChinhId?: Types.ObjectId | null;

  createdAt?: Date;

  updatedAt?: Date;
}

const NopQuyChiHoiSchema =
  new Schema<INopQuyChiHoi>(
    {
      chiHoiId: {
        type: Schema.Types.ObjectId,
        ref: "ChiHoi",
        required: true,
        index: true,
      },

      tenChiHoiSnapshot: {
        type: String,
        required: true,
        trim: true,
      },

      soTien: {
        type: Number,
        required: true,
        min: 1,
      },

      noiDung: {
        type: String,
        required: true,
        trim: true,
      },

      ghiChu: {
        type: String,
        trim: true,
        default: "",
      },

      ngayNop: {
        type: Date,
        required: true,
      },

      trangThai: {
        type: String,
        enum: [
          "CHO_DUYET",
          "DA_DUYET",
          "TU_CHOI",
        ],
        default: "CHO_DUYET",
        index: true,
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

      nguoiDuyetId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      nguoiDuyetTen: {
        type: String,
        trim: true,
        default: "",
      },

      ngayDuyet: {
        type: Date,
        default: null,
      },

      lyDoTuChoi: {
        type: String,
        trim: true,
        default: "",
      },

      giaoDichTaiChinhId: {
        type: Schema.Types.ObjectId,
        ref: "GiaoDichTaiChinh",
        default: null,
      },
    },
    {
      timestamps: true,
    },
  );

NopQuyChiHoiSchema.index({
  chiHoiId: 1,
  createdAt: -1,
});

const NopQuyChiHoi: Model<INopQuyChiHoi> =
  (models.NopQuyChiHoi as Model<INopQuyChiHoi>) ||
  mongoose.model<INopQuyChiHoi>(
    "NopQuyChiHoi",
    NopQuyChiHoiSchema,
  );

export default NopQuyChiHoi;