import mongoose, {
  Document,
  Model,
  Schema,
  Types,
} from "mongoose";

export type TrangThaiDiemRenLuyen =
  | "CHO_DUYET"
  | "DA_DUYET"
  | "TU_CHOI";

export type XepLoaiRenLuyen =
  | "XUAT_SAC"
  | "TOT"
  | "KHA"
  | "TRUNG_BINH"
  | "YEU";

export interface IDiemRenLuyen
  extends Document {
  hoiVienId: Types.ObjectId;

  chiHoiId: Types.ObjectId;

  hocKy: string;

  namHoc: string;

  diem: number;

  xepLoai:
    XepLoaiRenLuyen;

  nhanXet: string;

  trangThai:
    TrangThaiDiemRenLuyen;

  nguoiDeXuatId:
    Types.ObjectId;

  nguoiDuyetId?:
    Types.ObjectId | null;

  ngayDuyet?:
    Date | null;

  lyDoTuChoi:
    string;

  createdAt:
    Date;

  updatedAt:
    Date;
}

const DiemRenLuyenSchema =
  new Schema<IDiemRenLuyen>(
    {
      hoiVienId: {
        type:
          Schema.Types
            .ObjectId,

        ref:
          "HoiVien",

        required:
          true,

        index:
          true,
      },

      chiHoiId: {
        type:
          Schema.Types
            .ObjectId,

        ref:
          "ChiHoi",

        required:
          true,

        index:
          true,
      },

      hocKy: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },

      namHoc: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },

      diem: {
        type:
          Number,

        required:
          true,

        min:
          0,

        max:
          100,
      },

      xepLoai: {
        type:
          String,

        enum: [
          "XUAT_SAC",
          "TOT",
          "KHA",
          "TRUNG_BINH",
          "YEU",
        ],

        required:
          true,
      },

      nhanXet: {
        type:
          String,

        default:
          "",

        maxlength:
          2000,

        trim:
          true,
      },

      trangThai: {
        type:
          String,

        enum: [
          "CHO_DUYET",
          "DA_DUYET",
          "TU_CHOI",
        ],

        default:
          "CHO_DUYET",

        index:
          true,
      },

      nguoiDeXuatId: {
        type:
          Schema.Types
            .ObjectId,

        ref:
          "User",

        required:
          true,
      },

      nguoiDuyetId: {
        type:
          Schema.Types
            .ObjectId,

        ref:
          "User",

        default:
          null,
      },

      ngayDuyet: {
        type:
          Date,

        default:
          null,
      },

      lyDoTuChoi: {
        type:
          String,

        default:
          "",

        maxlength:
          1000,

        trim:
          true,
      },
    },
    {
      timestamps:
        true,

      versionKey:
        false,

      collection:
        "diem_ren_luyen",
    },
  );

/*
 * Mỗi Hội viên chỉ có
 * 1 kết quả / học kỳ / năm học.
 */
DiemRenLuyenSchema.index(
  {
    hoiVienId:
      1,

    hocKy:
      1,

    namHoc:
      1,
  },
  {
    unique:
      true,
  },
);

DiemRenLuyenSchema.index({
  chiHoiId:
    1,

  namHoc:
    1,

  hocKy:
    1,
});

const DiemRenLuyen:
  Model<IDiemRenLuyen> =
  mongoose.models
    .DiemRenLuyen ||
  mongoose.model<IDiemRenLuyen>(
    "DiemRenLuyen",

    DiemRenLuyenSchema,
  );

export default DiemRenLuyen;