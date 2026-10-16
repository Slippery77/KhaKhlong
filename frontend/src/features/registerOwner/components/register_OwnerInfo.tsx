import { useState } from "react";

export interface RegisterOwnerInfo {
    username: string;
    email: string;
    password: string;
    confirm_password: string;
}

export type RegisterOwnerFormProps = {
    initialValues?: Partial<RegisterOwnerInfo>;
    onNext?: (data: RegisterOwnerInfo) => void;
};

export function Register_OwnerForm({ initialValues, onNext }: RegisterOwnerFormProps = {}) {
    const [fromState, setFromState] = useState<RegisterOwnerInfo>({
        username: "",
        email: "",
        password: "",
        confirm_password: "",
        ...initialValues,
    });

    const handleChange = (field: keyof RegisterOwnerInfo, value: string) => {
        setFromState((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // TODO: validate ข้อมูลก่อนไปขั้นตอนถัดไป
        onNext?.(fromState);
    };

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>ชื่อผู้ใช้</label>
                    <input 
                        type="text"
                        value={fromState.username}
                        onChange={(e) => handleChange("username", e.target.value)}
                        className="border border-gray-300 rounded-2xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label>อีเมลล์</label>
                </div>
                <div>
                    <label>รหัสผ่าน</label>
                </div>
                <div>
                    <label>ยีนยันรหัสผ่าน</label>
                </div>
            </form>
        </div>
    );
}