import { useState } from "react";
import { useLogin } from "../hooks/useLogin";
import { useNavigate, useParams } from "react-router-dom";
import { Eye, EyeClosed } from 'lucide-react';

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
  const [showPassword, setShowPassword ] = useState(false);

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
      navigate(`/${formState.tenantSlug}/tables`); // ถ้า login สำเร็จให้ไปหน้า homepage
    }
  };
 
  const togglePasswordVisibility = () =>{
    setShowPassword((prev)=> !prev);
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-[#E6DCCF] bg-[#FDFBF7] p-10 shadow-sm">
      <h1 className=" text-2xl text-[#4B3B2A] font-semibold">เข้าสู่ระบบ</h1>
      <p className="text-sm text-[#4B3B2A] mb-6">เข้าสู่ระบบมาเริ่มค้าคล่องของคุณ</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className ="mb-6">
          <label className ="mb-2 block text-sm font-semibold text-[#4B3B2A]" htmlFor="username">ชื่อผู้ใช้</label>
          <input
            className="h-12 w-full rounded-lg border border-[#D8C9B6] bg-white px-5 text-[#3F3125] placeholder:text-[#9B8E82] focus:border-[#B59278] focus:outline-none focus:ring-2 focus:ring-[#E8D9C7]"
            type="text"
            placeholder="กรอกชื่อผู้ใช้"
            value={formState.username}
            onChange={(e) => handleChange("username", e.target.value)}
          />
        </div>
        <div className="mb-8">
          <label
            className="mb-2 block font-semibold text-sm text-[#4B3B2A]"
            htmlFor="password"
          >
            รหัสผ่าน
          </label>

        <div className="relative">
            <input
              className="h-12 w-full rounded-lg border border-[#D8C9B6] bg-white px-5 pr-14 text-[#3F3125] placeholder:text-[#9B8E82] focus:border-[#B59278] focus:outline-none focus:ring-2 focus:ring-[#E8D9C7]"
              type={showPassword ? 'text' : 'password'}
              placeholder="กรอกรหัสผ่าน"
              value={formState.password}
              onChange={(e) => handleChange("password", e.target.value)}
            />

            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-[#8C7B6A] hover:text-[#6E5C4C]">
                {showPassword ? <Eye size={20}/> : <EyeClosed size={20}/>}
            </button>
          </div>
        </div>
        <div>
          {error ?(<p role='alert'>{error}</p>) : null}
          <button 
          className = "h-12 w-full rounded-lg bg-[#5C4330] text-lg font-semibold text-white transition hover:bg-[#4B3B2A] active:scale-[0.98]"
          type="submit" 
          disabled={isSubmitting}>เข้าสู่ระบบ</button>
        </div>
      </form>
    </div>
  );
}
