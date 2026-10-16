import { useState } from "react";
import { useLogin } from "../hooks/useLogin";
import { useNavigate, useParams } from "react-router-dom";

{
  /*สร้างโครงสร้าง object*/
}
interface loginFormState {
  tenantSlug: string;
  username: string;
  password: string;
}

export default function LoginForm() {
  const { tenantSlug } = useParams<{tenantSlug:string}>();
  // เก็บค่าฟอร์ม login ทั้ง 3 ช่องแบบ object เพื่อจัดการข้อมูลรวมกันง่าย
  const [formState, setFormState] = useState<loginFormState>({
    tenantSlug: tenantSlug ?? "",
    username: "",
    password: "",
  });

  // อัปเดตค่าในฟอร์มตาม field ที่ผู้ใช้พิมพ์เข้าไป
  const handleChange = (field: keyof loginFormState, value: string) => {
    setFormState((prevState) => ({
      ...prevState,
      [field]: value,
    }));
  };

  // ดึงฟังก์ชัน login และสถานะจาก custom hook เพื่อใช้ในการส่งข้อมูลเข้าสู่ระบบ
  const { login, isSubmitting, error } = useLogin();
  const navigate = useNavigate();

  // เมื่อกด submit จะป้องกันการ refresh หน้า และเรียก login ด้วยข้อมูลจากฟอร์ม
  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const result =  await login(formState);

    if(result){
      navigate(`/${formState.tenantSlug}/mainpos`); // ถ้า login สำเร็จให้ไปหน้า homepage
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl bg-[#F5EFE4] p-7 shadow-sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className ="mb-6">
          <label className ="mb-2 block text-base font-medium text-[#4B3B2A]" htmlFor="username">Username</label>
          <input
            className="h-14 w-full rounded-2xl border border-[#D8C9B6] bg-white px-5 text-[#3F3125] placeholder:text-[#9B8E82] focus:border-[#B59278] focus:outline-none focus:ring-2 focus:ring-[#E8D9C7]"
            type="text"
            placeholder="Username"
            value={formState.username}
            onChange={(e) => handleChange("username", e.target.value)}
          />
        </div>
        <div className="mb-8">
          <label
            className="mb-2 block text-base font-medium text-[#4B3B2A]"
            htmlFor="password"
          >
            Password
          </label>

        <div className="relative">
            <input
              className="h-14 w-full rounded-2xl border border-[#D8C9B6] bg-white px-5 pr-14 text-[#3F3125] placeholder:text-[#9B8E82] focus:border-[#B59278] focus:outline-none focus:ring-2 focus:ring-[#E8D9C7]"
              type="password"
              placeholder="Password"
              value={formState.password}
              onChange={(e) => handleChange("password", e.target.value)}
            />

            <button
              type="button"
              className="absolute right-5 top-1/2 -translate-y-1/2 text-[#8C7B6A] hover:text-[#6E5C4C]">
              👁
            </button>
          </div>
        </div>
        <div>
          {error ?(<p role='alert'>{error}</p>) : null}
          <button 
          className = "h-14 w-full rounded-2xl bg-[#D8C2A9] text-lg font-semibold text-white transition hover:bg-[#C6A889] active:scale-[0.98]"
          type="submit" 
          disabled={isSubmitting}>Login</button>
        </div>
      </form>
    </div>
  );
}
