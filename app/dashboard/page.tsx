import { FileCheck2 } from "lucide-react";

export default function DashboardPage() {
  return (
    <section>
      <div className="mb-7">
        <p className="text-sm font-semibold text-[#12345B]">
          TRANG ĐIỀU HÀNH
        </p>

        <h1 className="mt-2 text-[28px] font-bold leading-tight text-slate-900">
          Tổng quan hệ thống
        </h1>

        <p className="mt-2 text-[15px] leading-6 text-slate-600">
          Theo dõi và quản lý các nghiệp vụ của Liên Chi hội Khoa Sư phạm.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[#12345B]">
            <FileCheck2 size={22} />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Chào mừng đến với hệ thống
            </h2>

            <p className="mt-2 max-w-3xl text-[15px] leading-6 text-slate-600">
              Chọn một danh mục ở thanh điều hướng bên trái để thực hiện các
              chức năng quản lý được phân quyền.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}