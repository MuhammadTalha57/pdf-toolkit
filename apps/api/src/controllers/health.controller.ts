import type {Request, Response} from "express"


export const checkHealth = async (req: Request, res: Response) => {
    res.status(200).json({
        success: true,
        data: {"backend": true}
    })
}