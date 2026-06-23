import express from 'express'
import employeemodel from '../models/employee.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs';
import transporter from '../nodemail.js'
import attendancemodel from '../models/attendance.js';
import adminmodel from '../models/admin.js';

export const register=async(req,res)=>{
    const {name,email,password}=req.body;
    if( !email || !password )
    {
        return res.status(401).send({message:"required data was missing"})
    }
    try {      
        const user =await employeemodel.findOne({email});
        if(user)
        {
            return res.status(400).send({message:"mail is alreay exist"});
        }

        const hashpassword=await bcrypt.hash(password,10);
        const otp=String(Math.floor(10000+Math.random()*90000))
        const newstudent={
            empId:otp,
            name,email,
            password:hashpassword,
           
        }

        const User=new employeemodel(newstudent);
        await User.save();

        const token=jwt.sign({id:User._id},process.env.SECRET_KEY,{expiresIn:'7d'})

        res.cookie('token',token ,{
            httpOnly:true,
            secure:process.env.NODE_ENV === 'production',
            sameSite:process.env.NODE_ENV === 'production'?'none':'lax',
            maxAge :7*24*60*60*1000
        })

        
        const verificationMail={
            from:process.env.SENDER_EMAIL,
            to:email,
            subject:"welcome to JNTU sulthanpur",
            text:`Welcome to JNTU sulthanpur your account has been created by email id ${email} and otp:${otp}`
        }

        await transporter.sendMail(verificationMail);

        // Notify admins of the new employee registration
        try {
            const admins = await adminmodel.find();
            const managers = await employeemodel.find({ role: { $in: ['hr', 'manager'] } });
            
            const recipientEmails = new Set();
            admins.forEach(a => { if (a.email) recipientEmails.add(a.email); });
            managers.forEach(m => { if (m.email) recipientEmails.add(m.email); });

            if (recipientEmails.size > 0) {
                const adminMail = {
                    from: process.env.SENDER_EMAIL,
                    to: Array.from(recipientEmails).join(', '),
                    subject: `WorkSync Alert: New Employee Registered - ${name}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
                            <div style="text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 10px; margin-bottom: 20px;">
                                <h2 style="color: #065f46; margin: 0;">New Employee Registered</h2>
                            </div>
                            <p>Hello Admin/Manager,</p>
                            <p>A new employee has registered in the WorkSync system:</p>
                            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold; color: #4a5568;">Name:</td>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #2d3748;">${name}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold; color: #4a5568;">Employee ID:</td>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #2d3748;">${otp}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold; color: #4a5568;">Email:</td>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #2d3748;">${email}</td>
                                </tr>
                            </table>
                            <p>By default, new employees are assigned the <strong>worker</strong> role without an active shift. Please log in to assign their shift and update their role as needed.</p>
                            <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
                            <p style="text-align: center; color: #a0aec0; font-size: 12px; margin: 0;">WorkSync System</p>
                        </div>
                    `
                };
                transporter.sendMail(adminMail).catch(err => console.error('Error sending registration notification to admins:', err));
            }
        } catch (emailErr) {
            console.error('Error sending registration notification:', emailErr);
        }

        return res.status(201).send({message:"register succesfullly"})
        
    } catch (error) {
        console.error({message:"error occur in signup",error})
    }
    
    
}

export const login=async(req,res)=>{
    const {empId,password}=req.body;
    if(!empId || !password)
    {
        return res.status(505).send({message:"Data missing"});
    }
    try {
        
        const user=await employeemodel.findOne({empId});
        if(!user)
        {
            return res.status(400).send({message:"user not exist"});
        }

        const check=await bcrypt.compare(password,user.password);
        if(!check)
        {
            return res.status(404).send({message:"password is incorrect"});
        }

        const token=jwt.sign({id:user._id, role:user.role},process.env.SECRET_KEY,{expiresIn:'7d'})

        res.cookie('token',token ,{
            httpOnly:true,
            secure:process.env.NODE_ENV === 'production',
            sameSite:process.env.NODE_ENV === 'production'?'none':'lax',
            maxAge :7*24*60*60*1000
        })

        return res.status(200).send({message:"Login succesfully"});


    } catch (error) {
        console.error({message:"error in login_page",error});
        console.log("error in login page")
        return res.status(400).send({message:"error occur in login"})
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

export const otp_Send=async(req,res)=>{
    const {email}=req.body;
        
    const user=await employeemodel.findOne({email});
    console.log({user});
    if(!user)
    {
        return res.status(400).send({message:"User Not found"})
    }
    try {

        const otp=String(Math.floor(10000+Math.random()*90000))

        const email=user.email;

        user.otpsend=otp;
        user.otp_expiry_time=Date.now()+5*60*1000;

        await user.save();

        const otpEmail={
            from:process.env.SENDER_EMAIL,
            to:email,
            subject:"Account verification OTP",
            text:`your otp is ${otp} . verify your account using this OTP`
        }

        await transporter.sendMail(otpEmail);

        return res.status(200).send({message:"otp send to email succesfully"});

    } catch (error) {
        console.error(error.message)
        return res.status(404).send({message:"error at otp_send",error})
    }
}

export const resetpassword=async(req,res)=>{
    const{email,password,otp}=req.body

    if(!email || !otp || !password)
    {
        return res.status(404).send({message:"Data missing"})
    }
    try {
        
        const user=await employeemodel.findOne({email});
        if(!user)
        {
            return res.status(404).send({message:"user not found"})
        }
        console.log(user.email)
        if(user.otpsend==="" || user.otpsend!==otp)
        {
            console.log(user.otpsend);
            console.log(otp);
            return res.status(401).send({message:"otp incorrect"})
        }
        if(user.otp_expiry_time<Date.now())
        {
            return res.status(402).send({message:"otp expired"})
        }
        const hashpassword=await bcrypt.hash(password,10)

        user.password=hashpassword
        user.otpsend=""
        user.otp_expiry_time=0
        await user.save()
        return res.status(200).send({message:"password reset succesfully"});

    } catch (error) {
        return res.send(400).send({message:"error in passreset",error})
    }
}

export const userdetails=async(req,res)=>{
    const {USER_ID, USER_ROLE}=req.body;

    try {
        let user = await employeemodel.findById(USER_ID);
        let role = USER_ROLE || 'worker';
        if (!user) {
            user = await adminmodel.findById(USER_ID);
            role = 'admin';
        } else {
            role = user.role || 'worker';
        }

        if (!user) {
            return res.status(404).send({message: "User details not found."});
        }

        const userData = user.toObject ? user.toObject() : user;
        return res.status(201).send({ ...userData, role });

    } catch (error) {
        console.error("Error in userdetails:", error);
        return res.status(400).send({message:"error occur in send details"});
    }
}

export const attendancedetails=async(req,res)=>{
    const {USER_ID}=req.body;
    try {
        const user=await employeemodel.findById(USER_ID);
        const details=user.empId;
        console.log(details);
        const Data=await attendancemodel.find({empId:details});
        if(!Data)
        {
            return res.status(201).send({message:"employee was new to industry",});
        }
        return res.status(201).send(Data);

    } catch (error) {
        return res.status(400).send({message:"error occur in attendance details"})
    }
}

export const employeedetails=async(req,res)=>{
    try {
        const user=await employeemodel.find();
        
        
        if(user.length===0)
        {
            return res.status(201).send({message:"employees are no there",});
        }
        return res.status(201).send(user);

    } catch (error) {
        return res.status(400).send({message:"error occur in employee details"})
    }
}

export const updateRole = async (req, res) => {
    const { empId, role, shift } = req.body;
    if (!['worker', 'hr', 'manager'].includes(role)) {
        return res.status(400).send({ message: 'Invalid role' });
    }
    try {
        const shiftTimes = { morning: '08:00', evening: '16:00', night: '00:00' };
        const update = { role };
        if (shift) {
            update.shift = shift;
            update.shiftStartTime = shiftTimes[shift] || '';
        }
        const user = await employeemodel.findOneAndUpdate({ empId }, update, { new: true });
        if (!user) return res.status(404).send({ message: 'Employee not found' });

        // Notify admins of the details change
        try {
            const admins = await adminmodel.find();
            const managers = await employeemodel.find({ role: { $in: ['hr', 'manager'] } });
            
            const recipientEmails = new Set();
            admins.forEach(a => { if (a.email) recipientEmails.add(a.email); });
            managers.forEach(m => { if (m.email) recipientEmails.add(m.email); });
            if (user.email) recipientEmails.add(user.email);

            if (recipientEmails.size > 0) {
                const changeMail = {
                    from: process.env.SENDER_EMAIL,
                    to: Array.from(recipientEmails).join(', '),
                    subject: `WorkSync Alert: Employee Details Changed - ${user.name}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
                            <div style="text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px;">
                                <h2 style="color: #1e3a8a; margin: 0;">Employee Details Updated</h2>
                            </div>
                            <p>Hello Admin/Manager,</p>
                            <p>Employee details have been updated by an administrator:</p>
                            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold; color: #4a5568;">Name:</td>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #2d3748;">${user.name}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold; color: #4a5568;">Employee ID:</td>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #2d3748;">${user.empId}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold; color: #4a5568;">New Role:</td>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #2d3748; text-transform: capitalize;">${user.role}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; font-weight: bold; color: #4a5568;">New Shift:</td>
                                    <td style="padding: 8px; border-bottom: 1px solid #edf2f7; color: #2d3748; text-transform: capitalize;">${user.shift || 'Unassigned'}</td>
                                </tr>
                            </table>
                            <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;" />
                            <p style="text-align: center; color: #a0aec0; font-size: 12px; margin: 0;">WorkSync System</p>
                        </div>
                    `
                };
                transporter.sendMail(changeMail).catch(err => console.error('Error sending change details notification:', err));
            }
        } catch (emailErr) {
            console.error('Error sending change details email:', emailErr);
        }

        return res.status(200).send({ message: 'Role and shift updated', user });
    } catch (error) {
        return res.status(400).send({ message: 'Error updating role', error });
    }
};
