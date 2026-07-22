import express from 'express'
import adminmodel from '../models/admin.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

export const login=async(req,res)=>{

    const {email,adminId,password}=req.body;
    if (!email || !adminId || !password) {
        return res.status(400).send({message:"Email, Admin ID, and password are required"});
    }
    try {
        const user=await adminmodel.findOne({email, adminId});
        if(!user)
        {
            return res.status(401).send({message:"Invalid Admin ID or Email"})
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).send({message:"Invalid password"});
        }

        const token=jwt.sign({id:user._id, role:'admin'},process.env.SECRET_KEY,{expiresIn:'7d'})
        
        res.cookie('token',token ,{
            httpOnly:true,
            secure:process.env.NODE_ENV === 'production',
            sameSite:process.env.NODE_ENV === 'production'?'none':'lax',
            maxAge :7*24*60*60*1000
        })
        
        return res.status(201).send({message:"enter the organization"})
    } catch (error) {
        return res.status(400).send({message:"error occur in admin login", error: error.message})
    }
};

export const send=async(req,res)=>{
    const {email,adminId}=req.body;
    try {
        const details={
            email,adminId
        };
        const user=new adminmodel(details);
        user.save();
        return res.status(201).send({message:"data saved"})
    } catch (error) {
        return res.status(201).send({message:"error occur in sending the data"})
    }
}


export const logout=async(req,res)=>{
    try {
        res.clearCookie('token',{
            httpOnly:true,
            secure:process.env.NODE_ENV === 'production',
            sameSite:process.env.NODE_ENV === 'production'?'none':'strict'
        })

        return res.status(200).send({message:"logout succesfully"})
    } catch (error) {
        console.error({message:"error in login_page",error});
    }
}