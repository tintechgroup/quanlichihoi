import mongoose, {
  Schema,
  Model,
  models,
  Types,
} from "mongoose";

export type TrangThaiHoiPhi =
  | "CHUA_NOP"
  | "DA_NOP";

export interface IHoiPhi {
  hoiVienId: Types.ObjectId;

  chiHoiId: Types.ObjectId;

  namHoc: string;

  soTien: number;

  trangThai: TrangThaiHoiPhi;

  ngayNop?: Date | null;

  nguoiXacNhanId?: Types.ObjectId | null;

  ghiChu?: string;

  createdAt?: Date;

  updatedAt?: Date;
}

const HoiPhiSchema = new Schema<IHoiPhi>(
  {
    hoiVienId: {
      type: Schema.Types.ObjectId,
      ref: "HoiVien",
      required: true,
    },

    chiHoiId: {
      type: Schema.Types.ObjectId,
      ref: "ChiHoi",
      required: true,
    },

    namHoc: {
      type: String,
      required: true,
      trim: true,
    },

    soTien: {
      type: Number,
      required: true,
      min: 0,
    },

    trangThai: {
      type: String,
      enum: [
        "CHUA_NOP",
        "DA_NOP",
      ],
      default: "CHUA_NOP",
    },

    ngayNop: {
      type: Date,
      default: null,
    },

    nguoiXacNhanId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    ghiChu: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

HoiPhiSchema.index(
  {
    hoiVienId: 1,
    namHoc: 1,
  },
  {
    unique: true,
  },
);

const HoiPhi: Model<IHoiPhi> =
  (models.HoiPhi as Model<IHoiPhi>) ||
  mongoose.model<IHoiPhi>(
    "HoiPhi",
    HoiPhiSchema,
  );

export default HoiPhi;