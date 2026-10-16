import { useContext } from "react"
import { KDSContext } from "../context/KDSContext"

export function useKDS() {
    const context = useContext(KDSContext)
    if (!context) {
        throw new Error("useKDS must be used within a KDSProvider")
    }
    return context
}
