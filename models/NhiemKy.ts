import mongoose, {
  Model,
  Schema,
  Types,
} from "mongoose";

export type TrangThaiNhiemKy =
  | "SAP_DIEN_RA"
  | "DANG_HOAT_DONG"
  | "DA_KET_THUC";

export interface INhiemKy {
  maNhiemKy: string;

  tenNhiemKy: string;

  tuNgay: Date;

  denNgay: Date;

  trangThai:
    TrangThaiNhiemKy;

  moTa?: string;

  nguoiTaoId:
    Types.ObjectId;

  nguoiTaoTen:
    string;

  createdAt?: Date;

  updatedAt?: Date;
}

const NhiemKySchema =
  new Schema<INhiemKy>(
    {
      maNhiemKy: {
        type:
          String,

        required:
          true,

        unique:
          true,

        index:
          true,

        trim:
          true,

        uppercase:
          true,

        maxlength:
          50,
      },

      tenNhiemKy: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          200,
      },

      tuNgay: {
        type:
          Date,

        required:
          true,

        index:
          true,
      },

      denNgay: {
        type:
          Date,

        required:
          true,

        index:
          true,
      },

      trangThai: {
        type:
          String,

        enum: [
          "SAP_DIEN_RA",
          "DANG_HOAT_DONG",
          "DA_KET_THUC",
        ],

        default:
          "SAP_DIEN_RA",

        index:
          true,
      },

      moTa: {
        type:
          String,

        trim:
          true,

        maxlength:
          2000,

        default:
          "",
      },

      nguoiTaoId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        required:
          true,
      },

      nguoiTaoTen: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          150,
      },
    },
    {
      timestamps:
        true,

      collection:
        "nhiem_ky",

      versionKey:
        false,
    },
  );

NhiemKySchema.index({
  trangThai:
    1,

  tuNgay:
    -1,
});

const NhiemKy:
  Model<INhiemKy> =
  (
    mongoose.models
      .NhiemKy as
      Model<INhiemKy>
  ) ||
  mongoose.model<INhiemKy>(
    "NhiemKy",
    NhiemKySchema,
  );

export default NhiemKy;