import mongoose, {
  type Model,
  Schema,
  type Types,
} from "mongoose";

export interface IDaDocThongBao {
  thongBaoId: Types.ObjectId;
  nguoiDungId: Types.ObjectId;

  daDoc: boolean;
  thoiGianDoc?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const DaDocThongBaoSchema =
  new Schema<IDaDocThongBao>(
    {
      thongBaoId: {
        type: Schema.Types.ObjectId,
        ref: "ThongBao",
        required: [
          true,
          "Không tìm thấy thông báo",
        ],
        index: true,
      },

      nguoiDungId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: [
          true,
          "Không tìm thấy người dùng",
        ],
        index: true,
      },

      daDoc: {
        type: Boolean,
        default: true,
        index: true,
      },

      thoiGianDoc: {
        type: Date,
        default: Date.now,
      },
    },
    {
      timestamps: true,
      collection: "da_doc_thong_bao",
    },
  );

/*
 * Mỗi tài khoản chỉ có một trạng thái đọc
 * đối với một thông báo.
 */
DaDocThongBaoSchema.index(
  {
    thongBaoId: 1,
    nguoiDungId: 1,
  },
  {
    unique: true,
  },
);

/*
 * Hỗ trợ lấy nhanh danh sách thông báo
 * đã đọc hoặc chưa đọc của người dùng.
 */
DaDocThongBaoSchema.index({
  nguoiDungId: 1,
  daDoc: 1,
  updatedAt: -1,
});

/*
 * Nếu đánh dấu lại thành chưa đọc,
 * xóa thời gian đã đọc.
 */
DaDocThongBaoSchema.pre("validate", function () {
  if (this.daDoc) {
    this.thoiGianDoc =
      this.thoiGianDoc || new Date();
  } else {
    this.thoiGianDoc = undefined;
  }
});

const DaDocThongBao: Model<IDaDocThongBao> =
  mongoose.models.DaDocThongBao ||
  mongoose.model<IDaDocThongBao>(
    "DaDocThongBao",
    DaDocThongBaoSchema,
  );

export default DaDocThongBao;