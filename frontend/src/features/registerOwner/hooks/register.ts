import { useState } from 'react';
import type { registerRequest} from '../types/register.types';

export default function useRegister(){
    const [isSubmitting , setIsSubmitting ] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const register = async (payload: registerRequest)=>{
        setError(null);
        setIsSubmitting(true);
        try{
            // path จริงของ backend คือ POST /api/register (RegisterController @Controller('register') + @Post(''))
            const response = await fetch('/api/register',{
                method: 'POST',
                headers:{'Content-Type':'application/json',},
                body: JSON.stringify(payload),
            });
            if(!response.ok){
                console.log(response.status);
                throw new Error("Invalid registration information");
            }
            const data = await response.json();
            return data;
        }catch(err){
            const message = err instanceof Error ? err.message : 'an unknown error occurred';
            setError(message);
            return null;
        }finally{
            setIsSubmitting(false);
        }
    }
    return {
        register,
        isSubmitting,
        error
    }
}