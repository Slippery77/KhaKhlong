import  LoginForm  from "../components/login_form";

export function LoginPage(){
    return(
        <div className="flex h-screen flex-col items-center justify-center gap-6 bg-[#F9F6F1] font-kanit">
            <div className="text-center">
                <h1 className ="text-5xl text-[#4B3B2A]">ค้าคล่อง</h1>
                <p className="text-sm text-[#8C7B6A]">ระบบจัดการร้านอาหาร</p>
            </div>
            <div className="w-full max-w-md px-4">
                <LoginForm />
            </div>
        </div>
    )
}