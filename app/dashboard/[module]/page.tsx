const moduleNames: Record<string, string> = {
  "chi-hoi": "Quản lý Chi hội",
  "hoi-vien": "Quản lý Hội viên",
  "ban-chap-hanh": "Quản lý Ban Chấp hành",
  "hoat-dong": "Quản lý hoạt động",
  "thong-bao-tai-lieu": "Thông báo và tài liệu",
  "bao-cao": "Thống kê và báo cáo",
  "danh-gia": "Xem đánh giá",
  "bao-mat": "Sao lưu và bảo mật",
};

export default async function ModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  const title = moduleNames[module] || "Chức năng hệ thống";

  return (
    <section>
      <div className="mb-7">
        <p className="text-sm font-semibold text-[#12345B]">
          QUẢN TRỊ HỆ THỐNG
        </p>

        <h1 className="mt-2 text-[28px] font-bold text-slate-900">
          {title}
        </h1>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[15px] leading-6 text-slate-600">
          Module {title.toLowerCase()} sẽ được triển khai ở bước tiếp theo.
        </p>
      </div>
    </section>
  );
}