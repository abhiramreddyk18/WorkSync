import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()
const userAuth=async(req,res,next)=>{

    const {token}=req.cookies;

    if(!token)
    {
        return res.status(400).send({message:"Not Authorizes,Login Again"});
    }
    try {
        
        const tokenDecode=jwt.verify(token,process.env.SECRET_KEY)

        if(tokenDecode.id)
        {
            req.body.USER_ID=tokenDecode.id;
            req.body.USER_ROLE=tokenDecode.role;

        }
        else{
            return res.status(400).send({message:"Not Authorized Login Again"})
        }
        next();

    } catch (error) {
        return res.status(400).send({message:"error in token authorization",error})
    }
}

export default userAuth;

export const requireRole = (...roles) => (req, res, next) => {
    const role = req.body.USER_ROLE;
    if (!roles.includes(role) && role !== 'admin') {
        return res.status(403).send({ message: 'Access denied: insufficient permissions' });
    }
    next();
};